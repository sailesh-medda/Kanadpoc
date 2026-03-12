from pydantic import BaseModel


class TranscriptRequest(BaseModel):

    patient_id: str
    transcript: str