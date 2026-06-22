import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query, status, APIRouter
from pydantic import BaseModel
import boto3
from botocore.exceptions import ClientError
from app.core.config import settings

router = APIRouter()

# --- Configuration ---
# Hardcoded per your environment, but ideally moved to environment variables later
# AWS_ACCESS_KEY_ID = "AWS_ACCESS_KEY_ID"
# AWS_SECRET_ACCESS_KEY = "AWS_SECRET_ACCESS_KEY"
# AWS_REGION = "ap-southeast-1"  # Change to your bucket's region if different
BUCKET_NAME = "vitalvue-debug"

# Initialize Boto3 Client
s3_client = boto3.client(
    "s3",
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name="ap-southeast-1" 
)

# --- Pydantic Schemas ---
class PresignedUrlRequest(BaseModel):
    object_name: str
    content_type: Optional[str] = "application/octet-stream"

class PresignedUrlResponse(BaseModel):
    url: str
    fields: dict  # Used for POST uploads

class FileInfo(BaseModel):
    key: str
    last_modified: str
    size: int

class PaginatedFilesResponse(BaseModel):
    files: List[FileInfo]
    next_continuation_token: Optional[str] = None
    has_more: bool

class BulkDeleteRequest(BaseModel):
    keys: List[str]

class PresignedDownloadResponse(BaseModel):
    url: str
    expires_in: int

# --- Routes ---

@router.post("/files/upload-url", response_model=PresignedUrlResponse, status_code=status.HTTP_200_OK)
def generate_upload_url(payload: PresignedUrlRequest):
    """
    Step 1: Generate a presigned POST URL.
    The frontend will use this URL and fields to upload the file directly to S3.
    """
    try:
        # URL expires in 1 hour (3600 seconds)
        response = s3_client.generate_presigned_post(
            Bucket=BUCKET_NAME,
            Key=payload.object_name,
            Fields={"Content-Type": payload.content_type},
            Conditions=[{"Content-Type": payload.content_type}],
            ExpiresIn=3600
        )
        return response
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files", response_model=PaginatedFilesResponse)
def list_and_sort_files(
    limit: int = Query(default=20, ge=1, le=1000),
    continuation_token: Optional[str] = Query(default=None)
):
    """
    Lists all files, strictly sorted with the latest items at the top.
    Handles pagination using S3's native ContinuationToken.
    """
    try:
        list_kwargs = {"Bucket": BUCKET_NAME, "MaxKeys": limit}
        if continuation_token:
            list_kwargs["ContinuationToken"] = continuation_token

        response = s3_client.list_objects_v2(**list_kwargs)
        
        if "Contents" not in response:
            return {"files": [], "next_continuation_token": None, "has_more": False}

        # Extract file metadata
        files = [
            FileInfo(
                key=obj["Key"],
                last_modified=obj["LastModified"].isoformat(),
                size=obj["Size"]
            )
            for obj in response["Contents"]
        ]

        # Sort: Latest Modified comes first (top)
        files.sort(key=lambda x: x.last_modified, reverse=True)

        return PaginatedFilesResponse(
            files=files,
            next_continuation_token=response.get("NextContinuationToken"),
            has_more=response.get("IsTruncated", False)
        )

    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/files/single", status_code=status.HTTP_200_OK)
def delete_single_file(key: str = Query(..., description="The S3 Object Key to delete")):
    """
    Delete a single file from the bucket.
    """
    try:
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=key)
        return {"message": f"Successfully deleted {key}"}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files/download-url", response_model=PresignedDownloadResponse, status_code=status.HTTP_200_OK)
def generate_download_url(
    key: str = Query(..., description="The S3 Object Key to download"),
    expires_in: int = Query(default=3600, ge=60, le=604800, description="URL expiration time in seconds")
):
    """
    Generates a secure, temporary presigned GET URL for downloading a file.
    The response header forces the client browser to download the file directly to their machine.
    """
    try:
        # Extract filename from key to suggest a clean filename for download saving
        filename = os.path.basename(key)
        
        response_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': key,
                # Forces browser download with a clean file name assignment
                'ResponseContentDisposition': f'attachment; filename="{filename}"'
            },
            ExpiresIn=expires_in
        )
        return PresignedDownloadResponse(url=response_url, expires_in=expires_in)
        
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/files/bulk", status_code=status.HTTP_200_OK)
def bulk_delete_files(payload: BulkDeleteRequest):
    """
    Delete multiple specified files in a single batch request (Up to 1000 keys).
    """
    if not payload.keys:
        raise HTTPException(status_code=400, detail="The keys list cannot be empty.")
    
    try:
        # Format keys for Boto3 delete_objects layout
        objects_to_delete = [{"Key": key} for key in payload.keys]
        
        # Boto3 handles up to 1000 keys per call natively
        response = s3_client.delete_objects(
            Bucket=BUCKET_NAME,
            Delete={"Objects": objects_to_delete, "Quiet": True}
        )
        
        if "Errors" in response:
            return {"message": "Partial success", "errors": response["Errors"]}
            
        return {"message": f"Successfully deleted {len(payload.keys)} files."}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/files/clear-all", status_code=status.HTTP_200_OK)
def clear_entire_bucket():
    """
    Deletes all files in the bucket completely. 
    Loops dynamically through paginated objects to ensure total cleanup.
    """
    try:
        paginator = s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=BUCKET_NAME)
        
        deleted_count = 0
        for page in pages:
            if "Contents" in page:
                objects_to_delete = [{"Key": obj["Key"]} for obj in page["Contents"]]
                s3_client.delete_objects(
                    Bucket=BUCKET_NAME,
                    Delete={"Objects": objects_to_delete, "Quiet": True}
                )
                deleted_count += len(objects_to_delete)
                
        return {"message": f"Bucket cleared completely. Total objects deleted: {deleted_count}"}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))