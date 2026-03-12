import os
from dotenv import load_dotenv

load_dotenv()

AZURE_PROJECT_ENDPOINT = os.getenv("AZURE_PROJECT_ENDPOINT")

WORKFLOW_NAME = os.getenv("WORKFLOW_NAME")