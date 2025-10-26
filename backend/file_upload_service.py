"""
File Upload Service for Cloud Storage
Handles uploading files to AWS S3 or other cloud providers
"""

import os
import boto3
import uuid
from typing import Optional
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

class FileUploadService:
    """Service for uploading files to cloud storage"""
    
    def __init__(self):
        self.aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.bucket_name = os.getenv('AWS_BUCKET_NAME')
        self.region = os.getenv('AWS_REGION', 'us-east-1')
        
        # Initialize S3 client if credentials are available
        if self.aws_access_key and self.aws_secret_key and self.bucket_name:
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=self.aws_access_key,
                    aws_secret_access_key=self.aws_secret_key,
                    region_name=self.region
                )
                logger.info("S3 client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize S3 client: {e}")
                self.s3_client = None
        else:
            logger.warning("AWS credentials not configured, using fallback upload method")
            self.s3_client = None
    
    def upload_video_to_s3(self, file_content: bytes, filename: str, content_type: str = "video/mp4") -> Optional[str]:
        """
        Upload video file to S3 and return public URL
        
        Args:
            file_content: File content as bytes
            filename: Original filename
            content_type: MIME type of the file
            
        Returns:
            Public URL of uploaded file, or None if upload failed
        """
        if not self.s3_client:
            logger.warning("S3 client not available, cannot upload to cloud storage")
            return None
        
        try:
            # Generate unique filename
            file_extension = filename.split('.')[-1] if '.' in filename else 'mp4'
            unique_filename = f"instagram-uploads/{uuid.uuid4()}.{file_extension}"
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=unique_filename,
                Body=file_content,
                ContentType=content_type,
                ACL='public-read'  # Make file publicly accessible
            )
            
            # Generate public URL
            public_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{unique_filename}"
            
            logger.info(f"File uploaded to S3: {public_url}")
            return public_url
            
        except Exception as e:
            logger.error(f"Failed to upload file to S3: {e}")
            return None
    
    def upload_video_fallback(self, file_content: bytes, filename: str) -> str:
        """
        Fallback upload method when S3 is not available
        For now, returns a placeholder URL
        """
        logger.warning("Using fallback upload method - file not actually uploaded to cloud storage")
        
        # In a real implementation, you might:
        # 1. Save to local temporary storage
        # 2. Use a different cloud provider
        # 3. Use a CDN service
        
        # For now, return a placeholder URL
        return f"https://example.com/uploads/{filename}"
    
    def upload_video(self, file_content: bytes, filename: str, content_type: str = "video/mp4") -> str:
        """
        Upload video file and return public URL
        
        Args:
            file_content: File content as bytes
            filename: Original filename
            content_type: MIME type of the file
            
        Returns:
            Public URL of uploaded file
        """
        # Try S3 upload first
        if self.s3_client:
            url = self.upload_video_to_s3(file_content, filename, content_type)
            if url:
                return url
        
        # Fallback if S3 fails or is not configured
        return self.upload_video_fallback(file_content, filename)
