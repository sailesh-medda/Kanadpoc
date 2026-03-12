# from fastapi import FastAPI
# from app.api.routes import router

# app = FastAPI(title="Kanad Ambient AI Backend")

# app.include_router(router)


# @app.get("/")
# def health():

#     return {"status": "running"}


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # or ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)