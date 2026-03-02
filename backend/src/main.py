from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.files.router import files_router


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

api_v1_router = APIRouter(prefix="/api/v1")

app.include_router(api_v1_router)
app.include_router(files_router)


