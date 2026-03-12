import json
import os
from datetime import datetime

OUTPUT_DIR = "workflow_results"


def save_agent_output(patient_id, agent_name, output):

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    file_path = f"{OUTPUT_DIR}/{patient_id}.json"

    data = {}

    if os.path.exists(file_path):
        with open(file_path) as f:
            data = json.load(f)

    timestamp = datetime.utcnow().isoformat()

    data[agent_name] = {
        "result": output,
        "timestamp": timestamp
    }

    with open(file_path, "w") as f:
        json.dump(data, f, indent=2)


def get_patient_data(patient_id):

    file_path = f"{OUTPUT_DIR}/{patient_id}.json"

    if not os.path.exists(file_path):
        return None

    with open(file_path) as f:
        return json.load(f)