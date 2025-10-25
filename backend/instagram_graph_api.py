"""
Instagram Graph API Integration - 2025
Handles Instagram Business/Creator account authentication and content publishing
"""

import os
import requests
import logging
from typing import Dict, Optional, Any
from fastapi import HTTPException
import boto3
from botocore.exceptions import ClientError
import uuid
from urllib.parse import urlencode
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class InstagramGraphAPI:
    def __init__(self):
        # Facebook App Configuration (Instagram Graph API uses Facebook App ID)
        self.app_id = os.getenv("FACEBOOK_APP_ID")
        self.app_secret = os.getenv("FACEBOOK_APP_SECRET")
        self.redirect_uri = os.getenv("INSTAGRAM_REDIRECT_URI", "http://localhost:3000/auth/instagram/graph/callback")
        
        # Instagram Graph API Configuration
        self.base_url = "https://graph.facebook.com/v19.0"
        self.scopes = [
            "instagram_basic",
            "instagram_content_publish",
            "pages_show_list",
            "pages_read_engagement"
        ]
        
        # AWS S3 Configuration for video uploads
        self.aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.aws_bucket_name = os.getenv("AWS_BUCKET_NAME")
        self.aws_region = os.getenv("AWS_REGION", "us-east-1")
        
        # Initialize S3 client if credentials are provided
        if self.aws_access_key_id and self.aws_secret_access_key:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=self.aws_access_key_id,
                aws_secret_access_key=self.aws_secret_access_key,
                region_name=self.aws_region
            )
        else:
            self.s3_client = None
            logger.warning("AWS S3 credentials not provided. Video uploads will not work.")

    def get_auth_url(self, state: str = None) -> str:
        """Generate Instagram OAuth authorization URL"""
        if not state:
            state = str(uuid.uuid4())
            
        params = {
            "client_id": self.app_id,
            "redirect_uri": self.redirect_uri,
            "scope": ",".join(self.scopes),
            "response_type": "code",
            "state": state
        }
        
        return f"https://www.facebook.com/v18.0/dialog/oauth?{urlencode(params)}"

    def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        token_url = f"{self.base_url}/oauth/access_token"
        
        params = {
            "client_id": self.app_id,
            "client_secret": self.app_secret,
            "redirect_uri": self.redirect_uri,
            "code": code
        }
        
        logger.info(f"Token exchange request: {token_url}")
        logger.info(f"Token exchange params: {params}")
        
        try:
            response = requests.post(token_url, data=params)
            logger.info(f"Token exchange response status: {response.status_code}")
            logger.info(f"Token exchange response: {response.text}")
            
            if response.status_code != 200:
                logger.error(f"Token exchange failed with status {response.status_code}: {response.text}")
                raise HTTPException(status_code=400, detail=f"Token exchange failed: {response.text}")
            
            data = response.json()
            
            if "error" in data:
                logger.error(f"Token exchange error: {data['error']}")
                raise HTTPException(status_code=400, detail=data["error"]["message"])
                
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Token exchange request failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Token exchange request failed: {str(e)}")

    def get_long_lived_token(self, short_lived_token: str) -> str:
        """Exchange short-lived token for long-lived token"""
        token_url = f"{self.base_url}/oauth/access_token"
        
        params = {
            "grant_type": "fb_exchange_token",
            "client_id": self.app_id,
            "client_secret": self.app_secret,
            "fb_exchange_token": short_lived_token
        }
        
        logger.info(f"Long-lived token request: {token_url}")
        logger.info(f"Long-lived token params: {params}")
        
        try:
            response = requests.post(token_url, data=params)
            logger.info(f"Long-lived token response status: {response.status_code}")
            logger.info(f"Long-lived token response: {response.text}")
            
            if response.status_code != 200:
                logger.error(f"Long-lived token exchange failed with status {response.status_code}: {response.text}")
                raise HTTPException(status_code=400, detail=f"Long-lived token exchange failed: {response.text}")
            
            data = response.json()
            
            if "error" in data:
                logger.error(f"Long-lived token error: {data['error']}")
                raise HTTPException(status_code=400, detail=data["error"]["message"])
                
            return data["access_token"]
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Long-lived token request failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Long-lived token request failed: {str(e)}")

    def get_user_pages(self, access_token: str) -> Dict[str, Any]:
        """Get Facebook pages associated with the user"""
        url = f"{self.base_url}/me/accounts"
        params = {"access_token": access_token}
        
        logger.info(f"Getting user pages: {url}")
        
        try:
            response = requests.get(url, params=params)
            logger.info(f"User pages response status: {response.status_code}")
            logger.info(f"User pages response: {response.text}")
            
            if response.status_code != 200:
                logger.error(f"Get user pages failed with status {response.status_code}: {response.text}")
                raise HTTPException(status_code=400, detail=f"Get user pages failed: {response.text}")
            
            data = response.json()
            
            if "error" in data:
                logger.error(f"Get user pages error: {data['error']}")
                raise HTTPException(status_code=400, detail=data["error"]["message"])
                
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Get user pages request failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Get user pages request failed: {str(e)}")

    def get_instagram_account(self, page_id: str, page_access_token: str) -> Dict[str, Any]:
        """Get Instagram Business account connected to Facebook page"""
        url = f"{self.base_url}/{page_id}"
        params = {
            "fields": "instagram_business_account",
            "access_token": page_access_token
        }
        
        logger.info(f"Getting Instagram account for page {page_id}: {url}")
        
        try:
            response = requests.get(url, params=params)
            logger.info(f"Instagram account response status: {response.status_code}")
            logger.info(f"Instagram account response: {response.text}")
            
            if response.status_code != 200:
                logger.error(f"Get Instagram account failed with status {response.status_code}: {response.text}")
                raise HTTPException(status_code=400, detail=f"Get Instagram account failed: {response.text}")
            
            data = response.json()
            
            if "error" in data:
                logger.error(f"Get Instagram account error: {data['error']}")
                raise HTTPException(status_code=400, detail=data["error"]["message"])
                
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Get Instagram account request failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Get Instagram account request failed: {str(e)}")

    def get_instagram_user_info(self, ig_user_id: str, access_token: str) -> Dict[str, Any]:
        """Get Instagram user information"""
        url = f"{self.base_url}/{ig_user_id}"
        params = {
            "fields": "id,username,account_type,followers_count,media_count",
            "access_token": access_token
        }
        
        logger.info(f"Getting Instagram user info for {ig_user_id}: {url}")
        
        try:
            response = requests.get(url, params=params)
            logger.info(f"Instagram user info response status: {response.status_code}")
            logger.info(f"Instagram user info response: {response.text}")
            
            if response.status_code != 200:
                logger.error(f"Get Instagram user info failed with status {response.status_code}: {response.text}")
                raise HTTPException(status_code=400, detail=f"Get Instagram user info failed: {response.text}")
            
            data = response.json()
            
            if "error" in data:
                logger.error(f"Get Instagram user info error: {data['error']}")
                raise HTTPException(status_code=400, detail=data["error"]["message"])
                
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Get Instagram user info request failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Get Instagram user info request failed: {str(e)}")

    def upload_video_to_s3(self, video_file, filename: str = None) -> str:
        """Upload video to S3 and return public URL"""
        if not self.s3_client:
            raise HTTPException(status_code=500, detail="S3 client not configured")
            
        if not filename:
            filename = f"instagram_videos/{uuid.uuid4()}.mp4"
            
        try:
            # Upload file to S3
            self.s3_client.upload_fileobj(
                video_file,
                self.aws_bucket_name,
                filename,
                ExtraArgs={
                    'ContentType': 'video/mp4',
                    'ACL': 'public-read'  # Make file publicly accessible
                }
            )
            
            # Return public URL
            return f"https://{self.aws_bucket_name}.s3.{self.aws_region}.amazonaws.com/{filename}"
            
        except ClientError as e:
            logger.error(f"S3 upload error: {e}")
            raise HTTPException(status_code=500, detail="Failed to upload video to cloud storage")

    def create_media_container(self, ig_user_id: str, access_token: str, video_url: str, caption: str = "") -> str:
        """Create Instagram media container for video"""
        url = f"{self.base_url}/{ig_user_id}/media"
        
        params = {
            "video_url": video_url,
            "caption": caption,
            "media_type": "REELS",  # For Instagram Reels
            "access_token": access_token
        }
        
        response = requests.post(url, data=params)
        data = response.json()
        
        if "error" in data:
            raise HTTPException(status_code=400, detail=data["error"]["message"])
            
        return data["id"]  # Return container ID

    def publish_media(self, ig_user_id: str, access_token: str, creation_id: str) -> Dict[str, Any]:
        """Publish Instagram media from container"""
        url = f"{self.base_url}/{ig_user_id}/media_publish"
        
        params = {
            "creation_id": creation_id,
            "access_token": access_token
        }
        
        response = requests.post(url, data=params)
        data = response.json()
        
        if "error" in data:
            raise HTTPException(status_code=400, detail=data["error"]["message"])
            
        return data

    def upload_and_publish_reel(self, ig_user_id: str, access_token: str, video_file, caption: str = "") -> Dict[str, Any]:
        """Complete flow: upload video and publish as Instagram Reel"""
        try:
            # Step 1: Upload video to S3
            video_url = self.upload_video_to_s3(video_file)
            logger.info(f"Video uploaded to S3: {video_url}")
            
            # Step 2: Create media container
            container_id = self.create_media_container(ig_user_id, access_token, video_url, caption)
            logger.info(f"Media container created: {container_id}")
            
            # Step 3: Publish media
            result = self.publish_media(ig_user_id, access_token, container_id)
            logger.info(f"Media published successfully: {result}")
            
            return {
                "success": True,
                "media_id": result["id"],
                "video_url": video_url,
                "container_id": container_id
            }
            
        except Exception as e:
            logger.error(f"Failed to upload and publish reel: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to upload and publish reel: {str(e)}")

    def validate_credentials(self) -> bool:
        """Validate that all required credentials are configured"""
        # Required for Instagram Graph API
        required_vars = [
            "FACEBOOK_APP_ID",
            "FACEBOOK_APP_SECRET"
        ]
        
        # Optional for video uploads (AWS S3)
        optional_vars = [
            "AWS_ACCESS_KEY_ID",
            "AWS_SECRET_ACCESS_KEY", 
            "AWS_BUCKET_NAME"
        ]
        
        missing_vars = []
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
                
        if missing_vars:
            logger.error(f"Missing required environment variables: {missing_vars}")
            return False
        
        # Check optional AWS credentials
        aws_missing = []
        for var in optional_vars:
            if not os.getenv(var):
                aws_missing.append(var)
        
        if aws_missing:
            logger.warning(f"AWS S3 credentials not configured: {aws_missing}. Video uploads will not work.")
            
        return True
