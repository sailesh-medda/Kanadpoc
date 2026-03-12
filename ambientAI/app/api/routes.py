from fastapi import APIRouter, HTTPException
from app.models.request_model import TranscriptRequest
from app.services.foundry_service import run_foundry_workflow
from app.services.storage_Service import get_patient_data

router = APIRouter()


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