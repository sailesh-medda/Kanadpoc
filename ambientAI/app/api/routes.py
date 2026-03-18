from fastapi import APIRouter, HTTPException
from app.models.request_model import TranscriptRequest
from app.services.foundry_service import run_foundry_workflow
from app.services.storage_Service import get_patient_data

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import httpx


load_dotenv()

SPEECH_KEY = os.getenv("SPEECH_KEY")
SPEECH_REGION = os.getenv("SPEECH_REGION", "eastus")
ALLOW_ORIGIN = os.getenv("ALLOW_ORIGIN", "*")


router = APIRouter()






@router.get("/api/speech/token")
async def get_speech_token():
    """
    Mint a short-lived token for the browser.
    Never expose your Speech key to the client.
    """
    issue_token_url = f"https://{SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
    headers = {"Ocp-Apim-Subscription-Key": SPEECH_KEY}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(issue_token_url, headers=headers)
            if r.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Token request failed: {r.text}")
            token = r.text
            return {"token": token, "region": SPEECH_REGION}
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"HTTP error: {e}") from e



@router.post("/transcript")
def process_transcript(request: TranscriptRequest):

    result = run_foundry_workflow(
        patient_id=request.patient_id,
        transcript=request.transcript
    )

    return {
        "patient_id": request.patient_id,
        "outputs": result
    }


@router.get("/patient/{patient_id}")
def get_patient(patient_id: str):

    data = get_patient_data(patient_id)

    if data is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    return {
        "patient_id": patient_id,
        "data": data
    }