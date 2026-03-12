from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(title="Kanad Ambient AI Backend")

app.include_router(router)


@app.get("/")
def health():

    return {"status": "running"}