from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

from app.config.settings import AZURE_PROJECT_ENDPOINT, WORKFLOW_NAME
from app.services.storage_Service import save_agent_output


def run_foundry_workflow(patient_id: str, transcript: str):

    project_client = AIProjectClient(
        endpoint=AZURE_PROJECT_ENDPOINT,
        credential=DefaultAzureCredential(),
    )

    detailed_report = ""
    sop_report = ""
    icd_cpt_codes = ""

    with project_client:

        openai_client = project_client.get_openai_client()

        conversation = openai_client.conversations.create()

        stream = openai_client.responses.create(
            conversation=conversation.id,
            input=transcript,
            stream=True,
            extra_body={
                "agent_reference": {
                    "name": WORKFLOW_NAME,
                    "type": "agent_reference",
                }
            },
        )

        current_agent = None

        for event in stream:

            event_type = getattr(event, "type", None)

            # Agent started
            if event_type == "response.output_item.added":

                if event.item.type == "workflow_action":
                    current_agent = event.item.action_id

            # Agent finished
            elif event_type == "response.output_item.done":

                current_agent = None

            # Text streaming
            elif event_type == "response.output_text.delta":

                if current_agent == "DetailedReportAgent":
                    detailed_report += event.delta

                elif current_agent == "SOPReportAgent":
                    sop_report += event.delta

                elif current_agent == "ICDCPTAgent":
                    icd_cpt_codes += event.delta

        openai_client.conversations.delete(conversation_id=conversation.id)

    save_agent_output(patient_id, "detailed_report", detailed_report)
    save_agent_output(patient_id, "sop_report", sop_report)
    save_agent_output(patient_id, "icd_cpt_codes", icd_cpt_codes)

    return {
        "detailed_report": detailed_report,
        "sop_report": sop_report,
        "icd_cpt_codes": icd_cpt_codes,
    }