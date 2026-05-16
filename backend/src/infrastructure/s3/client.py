from contextlib import asynccontextmanager
from typing import BinaryIO, AsyncIterator

from aiobotocore.session import get_session


class S3Client:
    def __init__(
        self,
        access_key: str,
        secret_key: str,
        internal_endpoint: str,
        public_endpoint: str,
        bucket_name: str
    ):
        self.bucket_name = bucket_name
        self.internal_endpoint = internal_endpoint
        self.public_endpoint = public_endpoint

        self.config = {
            "aws_access_key_id": access_key,
            "aws_secret_access_key": secret_key,
        }

        self.session = get_session()

    @asynccontextmanager
    async def get_internal_client(self) -> AsyncIterator:
        async with self.session.create_client(
            "s3",
            endpoint_url=self.internal_endpoint,
            **self.config,
        ) as client:
            yield client

    @asynccontextmanager
    async def get_public_client(self) -> AsyncIterator:
        async with self.session.create_client(
            "s3",
            endpoint_url=self.public_endpoint,
            **self.config,
        ) as client:
            yield client

    async def upload_file(self, object_name: str, data: BinaryIO) -> None:
        async with self.get_internal_client() as client:
            await client.put_object(
                Bucket=self.bucket_name,
                Key=object_name,
                Body=data,
                ContentType="image/webp",
            )

    async def get_file_by_key(self, key: str, expires_in: int = 3600) -> str:
        async with self.get_public_client() as client:
            url = await client.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": self.bucket_name, "Key": key},
                ExpiresIn=expires_in
            )
            return url