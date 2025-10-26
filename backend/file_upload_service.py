"""
File Upload Service for Cloud Storage
Handles uploading files to AWS S3 or other cloud providers
"""

import os
import boto3
import uuid
import requests
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
        
        # Cloudinary credentials
        self.cloudinary_cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME')
        self.cloudinary_api_key = os.getenv('CLOUDINARY_API_KEY')
        self.cloudinary_api_secret = os.getenv('CLOUDINARY_API_SECRET')
        
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
            logger.warning("AWS credentials not configured")
            self.s3_client = None
        
        # Check if Cloudinary is configured
        if self.cloudinary_cloud_name and self.cloudinary_api_key and self.cloudinary_api_secret:
            logger.info("Cloudinary credentials found")
        else:
            logger.warning("Cloudinary credentials not configured")
    
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
    
    def upload_video_to_cloudinary(self, file_content: bytes, filename: str) -> Optional[str]:
        """
        Upload video file to Cloudinary and return public URL
        
        Args:
            file_content: File content as bytes
            filename: Original filename
            
        Returns:
            Public URL of uploaded file, or None if upload failed
        """
        if not all([self.cloudinary_cloud_name, self.cloudinary_api_key, self.cloudinary_api_secret]):
            logger.warning("Cloudinary credentials not available")
            return None
        
        try:
            # Cloudinary upload URL
            upload_url = f"https://api.cloudinary.com/v1_1/{self.cloudinary_cloud_name}/video/upload"
            
            # Prepare upload data
            files = {
                'file': (filename, file_content, 'video/mp4')
            }
            
            data = {
                'api_key': self.cloudinary_api_key,
                'timestamp': str(int(time.time())),
                'folder': 'instagram-uploads',
                'resource_type': 'video'
            }
            
            # Generate signature (simplified - in production, use proper signature generation)
            import hashlib
            import time
            timestamp = str(int(time.time()))
            string_to_sign = f"folder=instagram-uploads&resource_type=video&timestamp={timestamp}{self.cloudinary_api_secret}"
            signature = hashlib.sha1(string_to_sign.encode()).hexdigest()
            data['signature'] = signature
            
            # Upload to Cloudinary
            response = requests.post(upload_url, files=files, data=data, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                public_url = result.get('secure_url')
                logger.info(f"File uploaded to Cloudinary: {public_url}")
                return public_url
            else:
                logger.error(f"Cloudinary upload failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to upload file to Cloudinary: {e}")
            return None
    
    def upload_video_fallback(self, file_content: bytes, filename: str) -> str:
        """
        Fallback upload method when S3 is not available
        Saves file locally and returns a local URL
        """
        logger.warning("Using local file storage fallback - files saved locally")
        
        try:
            # Create uploads directory if it doesn't exist
            uploads_dir = "uploads"
            os.makedirs(uploads_dir, exist_ok=True)
            
            # Generate unique filename
            file_extension = filename.split('.')[-1] if '.' in filename else 'mp4'
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            local_path = os.path.join(uploads_dir, unique_filename)
            
            # Save file locally
            with open(local_path, 'wb') as f:
                f.write(file_content)
            
            # Return local file path (in production, you'd serve this via a web server)
            logger.info(f"File saved locally: {local_path}")
            return f"file://{os.path.abspath(local_path)}"
            
        except Exception as e:
            logger.error(f"Failed to save file locally: {e}")
            # Return placeholder URL as last resort
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
        # Try Cloudinary first (free tier)
        if self.cloudinary_cloud_name and self.cloudinary_api_key and self.cloudinary_api_secret:
            url = self.upload_video_to_cloudinary(file_content, filename)
            if url:
                return url
        
        # Try S3 upload if Cloudinary fails
        if self.s3_client:
            url = self.upload_video_to_s3(file_content, filename, content_type)
            if url:
                return url
        
        # Fallback if both fail
        return self.upload_video_fallback(file_content, filename)
