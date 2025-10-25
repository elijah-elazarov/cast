import os
import uuid
import requests
import logging
from urllib.parse import urlencode
from typing import Dict, Any
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class InstagramPlatformAPI:
    """Instagram Platform API using direct Instagram OAuth (not Facebook Graph API)"""
    
    def __init__(self):
        self.app_id = os.getenv('FACEBOOK_APP_ID')
        self.app_secret = os.getenv('FACEBOOK_APP_SECRET')
        self.redirect_uri = os.getenv('INSTAGRAM_PLATFORM_REDIRECT_URI') or os.getenv('INSTAGRAM_REDIRECT_URI')
        
        if not all([self.app_id, self.app_secret, self.redirect_uri]):
            raise ValueError("Missing required Instagram Platform API credentials")
        
        # Instagram Platform OAuth scopes
        self.scopes = [
            "instagram_basic",
            "instagram_content_publish"
        ]
        
        # Instagram Platform API base URL
        self.base_url = "https://api.instagram.com"
        self.graph_url = "https://graph.instagram.com"
        
        logger.info("Instagram Platform API initialized")

    def get_auth_url(self, state: str = None) -> str:
        """Generate Instagram Platform OAuth authorization URL"""
        if not state:
            state = str(uuid.uuid4())
            
        params = {
            "client_id": self.app_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": ",".join(self.scopes),
            "state": state
        }
        
        return f"{self.base_url}/oauth/authorize?{urlencode(params)}"

    def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        token_url = f"{self.base_url}/oauth/access_token"
        
        params = {
            "client_id": self.app_id,
            "client_secret": self.app_secret,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
            "code": code
        }
        
        logger.info(f"Exchanging code for token: {token_url}")
        
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

    def get_long_lived_token(self, access_token: str) -> str:
        """Get long-lived access token"""
        url = f"{self.graph_url}/access_token"
        params = {
            "grant_type": "ig_exchange_token",
            "client_secret": self.app_secret,
            "access_token": access_token
        }
        
        logger.info(f"Getting long-lived token: {url}")
        
        try:
            response = requests.get(url, params=params)
            logger.info(f"Long-lived token response status: {response.status_code}")
            logger.info(f"Long-lived token response: {response.text}")
            
            if response.status_code != 200:
                logger.error(f"Long-lived token failed with status {response.status_code}: {response.text}")
                raise HTTPException(status_code=400, detail=f"Long-lived token failed: {response.text}")
            
            data = response.json()
            
            if "error" in data:
                logger.error(f"Long-lived token error: {data['error']}")
                raise HTTPException(status_code=400, detail=data["error"]["message"])
                
            return data.get("access_token")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Long-lived token request failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Long-lived token request failed: {str(e)}")

    def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get Instagram user information"""
        url = f"{self.graph_url}/me"
        params = {
            "fields": "id,username,account_type,media_count",
            "access_token": access_token
        }
        
        logger.info(f"Getting user info: {url}")
        
        try:
            response = requests.get(url, params=params)
            logger.info(f"User info response status: {response.status_code}")
            logger.info(f"User info response: {response.text}")
            
            if response.status_code != 200:
                logger.error(f"Get user info failed with status {response.status_code}: {response.text}")
                raise HTTPException(status_code=400, detail=f"Get user info failed: {response.text}")
            
            data = response.json()
            
            if "error" in data:
                logger.error(f"Get user info error: {data['error']}")
                raise HTTPException(status_code=400, detail=data["error"]["message"])
                
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Get user info request failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Get user info request failed: {str(e)}")

    def publish_media(self, access_token: str, media_url: str, caption: str = "") -> Dict[str, Any]:
        """Publish media to Instagram"""
        # First, create media container
        create_url = f"{self.graph_url}/me/media"
        create_params = {
            "image_url": media_url,
            "caption": caption,
            "access_token": access_token
        }
        
        logger.info(f"Creating media container: {create_url}")
        
        try:
            create_response = requests.post(create_url, data=create_params)
            logger.info(f"Create media response status: {create_response.status_code}")
            logger.info(f"Create media response: {create_response.text}")
            
            if create_response.status_code != 200:
                logger.error(f"Create media failed with status {create_response.status_code}: {create_response.text}")
                raise HTTPException(status_code=400, detail=f"Create media failed: {create_response.text}")
            
            create_data = create_response.json()
            
            if "error" in create_data:
                logger.error(f"Create media error: {create_data['error']}")
                raise HTTPException(status_code=400, detail=create_data["error"]["message"])
            
            # Then, publish the media
            media_id = create_data.get("id")
            if not media_id:
                raise HTTPException(status_code=400, detail="No media ID returned from create media")
            
            publish_url = f"{self.graph_url}/me/media_publish"
            publish_params = {
                "creation_id": media_id,
                "access_token": access_token
            }
            
            logger.info(f"Publishing media: {publish_url}")
            
            publish_response = requests.post(publish_url, data=publish_params)
            logger.info(f"Publish media response status: {publish_response.status_code}")
            logger.info(f"Publish media response: {publish_response.text}")
            
            if publish_response.status_code != 200:
                logger.error(f"Publish media failed with status {publish_response.status_code}: {publish_response.text}")
                raise HTTPException(status_code=400, detail=f"Publish media failed: {publish_response.text}")
            
            publish_data = publish_response.json()
            
            if "error" in publish_data:
                logger.error(f"Publish media error: {publish_data['error']}")
                raise HTTPException(status_code=400, detail=publish_data["error"]["message"])
                
            return publish_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Publish media request failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Publish media request failed: {str(e)}")
