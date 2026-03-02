from fastapi import APIRouter, Depends, File, UploadFile
from starlette import status

from core.files.services import FileService, get_file_service


files_router = APIRouter(prefix="/files", tags=["files"])


@files_router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
)
async def upload_file(
    file: UploadFile = File(...),
    service: FileService = Depends(get_file_service),
):
    file_name = file.filename

    await service.upload_file(file_name, file.file)

    return {"msg": f"File {file_name} uploaded"}


@files_router.get(
    "/{key}",
    status_code=status.HTTP_200_OK,
)
async def get_files(
    key: str,
    service: FileService = Depends(get_file_service),
):
    presigned_url = await service.get_file_by_key(f"{key}.webp")

    return {"presigned_url": presigned_url}
