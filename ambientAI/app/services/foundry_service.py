# app/services/foundry_service.py

import logging
from collections import deque
from typing import Dict, Optional

from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

from app.config.settings import AZURE_PROJECT_ENDPOINT, WORKFLOW_NAME
from app.services.storage_Service import save_agent_output

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)  # use INFO in prod

# --- ROUTING CONFIG ---

# If the SDK exposes created_by.agent.name, we map those directly:
AGENT_TO_BUCKET = {
    "DetailedReportAgent": "detailed_report",
    "SOPReportAgent": "sop_report",
    "ICDCPTAgent": "icd_cpt_codes",
}

# If the SDK does not expose agent names for message items,
# we rely on the associated InvokeAzureAgent action "label".
# Use EXACTLY what you see in the portal for those node labels.
ACTION_NAME_TO_BUCKET = {
    # e.g. from your trace:
    # InvokeAzureAgent: ambientainotestaker -> detailed
    "ambientainotestaker": "detailed_report",
    "SOAPNotes": "sop_report",
    "ICDCPTcodes": "icd_cpt_codes",
}

# If action name is absent as well, we use the ordinal of InvokeAzureAgent steps:
# 1st -> detailed, 2nd -> sop, 3rd -> icd/cpt
INVOKE_ORDER_TO_BUCKET = {
    1: "detailed_report",
    2: "sop_report",
    3: "icd_cpt_codes",
}

# Keyword fallback (content-based) if neither agent name nor action mapping works:
KEYWORD_ROUTING = [
    ("subjective", "sop_report"),
    ("assessment", "sop_report"),
    ("plan", "sop_report"),
    ("soap", "sop_report"),
    ("icd-10", "icd_cpt_codes"),
    ("cpt", "icd_cpt_codes"),
    ("code", "icd_cpt_codes"),
    ("detailed report", "detailed_report"),
    ("patient information", "detailed_report"),
]


def _safe_get(obj, *path, default=None):
    cur = obj
    for key in path:
        if cur is None:
            return default
        cur = getattr(cur, key, default) if not isinstance(cur, dict) else cur.get(key, default)
    return cur if cur is not None else default


def _route_bucket(agent_name: Optional[str],
                  action_name: Optional[str],
                  invoke_index: Optional[int],
                  text_sample: str) -> Optional[str]:
    """Decide the output bucket by (1) agent name, (2) action label, (3) action ordinal, then (4) keywords."""
    # 1) Agent name direct map
    if agent_name:
        bucket = AGENT_TO_BUCKET.get(agent_name)
        if bucket:
            return bucket

    # 2) Action label (from portal)
    if action_name:
        # the portal span name is e.g. "InvokeAzureAgent: SOAPNotes"
        # we store only the right side in ACTION_NAME_TO_BUCKET, so normalize:
        label = action_name.strip()
        if label.lower().startswith("invokeazureagent:"):
            label = label.split(":", 1)[1].strip()
        bucket = ACTION_NAME_TO_BUCKET.get(label)
        if bucket:
            return bucket

    # 3) Action ordinal
    if invoke_index in INVOKE_ORDER_TO_BUCKET:
        return INVOKE_ORDER_TO_BUCKET[invoke_index]

    # 4) Content keywords
    sample = (text_sample or "").lower()[:1000]
    for kw, bucket in KEYWORD_ROUTING:
        if kw in sample:
            return bucket

    return None


def run_foundry_workflow(patient_id: str, transcript: str) -> Dict[str, str]:
    outputs = {"detailed_report": "", "sop_report": "", "icd_cpt_codes": ""}

    # Buffer per message: item_id -> {agent_name, text, action_name, invoke_index}
    msg_buffers: Dict[str, Dict[str, Optional[str] | str | int]] = {}

    # Queue of the most recent workflow actions (so we can associate next message to it)
    # We only need a simple queue because your trace shows each Invoke emits exactly one message.
    pending_actions = deque()

    # Track ordinal index for InvokeAzureAgent nodes
    invoke_ordinal = 0

    stats = {"message_items": 0, "text_deltas": 0, "messages_done": 0, "invoke_nodes": 0}

    logger.info("[WF] patient=%s, workflow=%s", patient_id, WORKFLOW_NAME)

    project_client = AIProjectClient(
        endpoint=AZURE_PROJECT_ENDPOINT,
        credential=DefaultAzureCredential(),
    )

    with project_client:
        openai_client = project_client.get_openai_client()
        conversation = openai_client.conversations.create()
        logger.info("[WF] conversation id=%s", conversation.id)

        request_input = [{"role": "user", "content": transcript}]

        stream = openai_client.responses.create(
            conversation=conversation.id,
            input=request_input,
            stream=True,
            extra_body={"agent_reference": {"name": WORKFLOW_NAME, "type": "agent_reference"}},
            # Keep on for a few runs to surface deeper fields; disable later
            metadata={"x-ms-debug-mode-enabled": "1"},
        )

        logger.info("[WF] STREAM START")

        for event in stream:
            et = getattr(event, "type", None)
            logger.debug("EVT %-30s %s", et, _safe_get(event, "delta", default=""))

            # A) A new output item was added (message, tool call, or workflow_action)
            if et == "response.output_item.added":
                item = getattr(event, "item", None)
                if not item:
                    continue

                item_type = getattr(item, "type", None)

                if item_type == "workflow_action":
                    # Record this action so the next message can be associated with it
                    kind = _safe_get(item, "kind")  # e.g., "InvokeAzureAgent"
                    action_id = _safe_get(item, "action_id")
                    # Try to fetch a human-friendly label if any (SDKs differ)
                    # We derive from tracing only if surfaced; often it's not in this event.
                    # We'll still keep a best-effort slot for it.
                    action_label = _safe_get(item, "name") or _safe_get(item, "label")

                    # Increment ordinal for InvokeAzureAgent only
                    if kind and kind.lower() == "invokeazureagent":
                        invoke_ordinal += 1
                        stats["invoke_nodes"] += 1

                    pending_actions.append({
                        "kind": kind,
                        "action_id": action_id,
                        "label": action_label,
                        "invoke_index": invoke_ordinal if (kind and kind.lower()=="invokeazureagent") else None
                    })

                    logger.info("  [+] workflow_action: kind=%s action_id=%s label=%s invoke_index=%s",
                                kind, action_id, action_label, invoke_ordinal if (kind and kind.lower()=="invokeazureagent") else "-")

                elif item_type == "message":
                    item_id = _safe_get(item, "id")
                    stats["message_items"] += 1
                    agent_name = _safe_get(item, "created_by", "agent", "name")

                    # Try to pair with the most recent action (if any)
                    action_info = pending_actions.popleft() if pending_actions else None
                    action_label = None
                    action_invoke_idx = None

                    # If we have tracing context available (some SDKs surface), try to read it:
                    # (In many builds, we may not have it – in which case we rely on the queue we kept)
                    if not action_info:
                        # No action queued; leave None and rely on name/keywords later
                        pass
                    else:
                        action_label = action_info.get("label")
                        action_invoke_idx = action_info.get("invoke_index")

                    msg_buffers[item_id] = {
                        "agent_name": agent_name or "",
                        "text": "",
                        "action_name": action_label,
                        "invoke_index": action_invoke_idx,
                    }

                    logger.info("  [+] message added: item_id=%s agent_name=%s action_label=%s invoke_index=%s",
                                item_id, agent_name, action_label, action_invoke_idx)

            # B) Token delta
            elif et == "response.output_text.delta":
                stats["text_deltas"] += 1
                item_id = getattr(event, "item_id", None)
                if item_id and item_id in msg_buffers:
                    msg_buffers[item_id]["text"] += event.delta

            # C) Item done (commit message)
            elif et == "response.output_item.done":
                item = getattr(event, "item", None)
                if _safe_get(item, "type") == "message":
                    item_id = _safe_get(item, "id")
                    if item_id and item_id in msg_buffers:
                        stats["messages_done"] += 1
                        buf = msg_buffers[item_id]
                        agent_name = buf["agent_name"]
                        action_label = buf["action_name"]
                        invoke_index = buf["invoke_index"]
                        text = buf["text"]

                        bucket = _route_bucket(agent_name, action_label, invoke_index, text)
                        if bucket:
                            outputs[bucket] += text
                            logger.info("  [✓] routed message item_id=%s -> %s (agent=%s, label=%s, invoke=%s, len=%d)",
                                        item_id, bucket, agent_name, action_label, invoke_index, len(text))
                        else:
                            logger.warning("  [!] UNROUTED message item_id=%s (agent=%s, label=%s, invoke=%s, len=%d)",
                                           item_id, agent_name, action_label, invoke_index, len(text))

                        del msg_buffers[item_id]

        logger.info("[WF] STREAM END  stats=%s", stats)

        # Fallback: if nothing captured, parse final response once (non-streaming)
        if all(not (outputs[k] or "").strip() for k in outputs):
            logger.warning("[WF] No text captured via stream; parsing non-streaming output.")
            resp = openai_client.responses.create(
                conversation=conversation.id,
                input=request_input,
                stream=False,
                extra_body={"agent_reference": {"name": WORKFLOW_NAME, "type": "agent_reference"}},
                metadata={"x-ms-debug-mode-enabled": "1"},
            )

            # Iterate final output items in order and assign by action ordinal / keywords
            message_idx = 0
            for out in getattr(resp, "output", []) or []:
                if _safe_get(out, "type") != "message":
                    continue
                message_idx += 1

                # Concatenate all output_text parts
                text_parts = []
                for part in getattr(out, "content", []) or []:
                    if _safe_get(part, "type") == "output_text":
                        text_parts.append(_safe_get(part, "text", default="") or "")
                text_full = "".join(text_parts)

                # Try name then ordinal then keywords
                agent_name = _safe_get(out, "created_by", "agent", "name")
                bucket = _route_bucket(agent_name, None, message_idx, text_full)
                if bucket:
                    outputs[bucket] += text_full
                    logger.info("  [✓ Fallback] message #%d -> %s (agent=%s, len=%d)",
                                message_idx, bucket, agent_name, len(text_full))
                else:
                    logger.warning("  [!] Fallback: message #%d unrouted; appending to detailed_report", message_idx)
                    outputs["detailed_report"] += text_full

        # Cleanup
        openai_client.conversations.delete(conversation_id=conversation.id)
        logger.info("[WF] conversation deleted id=%s", conversation.id)

    # Trim + persist
    for k in outputs:
        outputs[k] = outputs[k].strip()

    save_agent_output(patient_id, "detailed_report", outputs["detailed_report"])
    save_agent_output(patient_id, "sop_report", outputs["sop_report"])
    save_agent_output(patient_id, "icd_cpt_codes", outputs["icd_cpt_codes"])

    logger.info("[WF] Final lengths: detailed=%d sop=%d icd_cpt=%d",
                len(outputs["detailed_report"]), len(outputs["sop_report"]), len(outputs["icd_cpt_codes"]))

    return outputs
