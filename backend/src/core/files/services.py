from typing import BinaryIO
from io import BytesIO

from PIL import Image
from sqlalchemy.util import await_only

from infrastructure.s3.client import S3Client
from settings import settings


class FileService:
    def __init__(self):
        self.s3_client = S3Client(
            settings.s3.access_key.get_secret_value(),
            settings.s3.secret_key.get_secret_value(),
            settings.s3.private_endpoint_url,
            settings.s3.public_endpoint_url,
            "files"
        )

    async def upload_file(self, file_name: str, file: BinaryIO):
        image = Image.open(file)

        converted_image = BytesIO()
        image.save(converted_image, format="WEBP", quality=80, optimize=True)
        converted_image.seek(0)

        webp_file_name = file_name.rsplit(".", 1)[0] + ".webp"

        await self.s3_client.upload_file(webp_file_name, converted_image)

        return webp_file_name

    async def get_file_by_key(self, key: str) -> str:
        return await self.s3_client.get_file_by_key(key)


def get_file_service() -> FileService:
    return FileService()
