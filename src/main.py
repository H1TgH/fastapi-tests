from fastapi import APIRouter, FastAPI


app = FastAPI()

api_v1_router = APIRouter(prefix="/api/v1")

app.include_router(api_v1_router)
