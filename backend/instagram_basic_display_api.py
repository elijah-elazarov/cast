"""
Instagram Basic Display API Integration - 2025
Simple web-based Instagram authentication for personal accounts
No advanced access required - works with personal Instagram accounts
"""

import os
import requests
import logging
import secrets
from typing import Dict, Optional, Any
from fastapi import HTTPException
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

class InstagramBasicDisplayAPI:
    """
    Instagram Basic Display API integration for personal accounts
    No advanced access required - works with personal Instagram accounts
    """
    
    def __init__(self):
        # Instagram Basic Display API Configuration
        self.app_id = os.getenv("INSTAGRAM_APP_ID")
        self.app_secret = os.getenv("INSTAGRAM_APP_SECRET")
        self.redirect_uri = os.getenv("INSTAGRAM_REDIRECT_URI")
        if not self.redirect_uri:
            raise ValueError("INSTAGRAM_REDIRECT_URI environment variable is required")
        
        if not self.app_id or not self.app_secret:
            logger.warning("Instagram Basic Display API: Missing INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET")
        
        # API Configuration
        self.api_version = "v18.0"
        self.graph_base = f"https://graph.instagram.com/{self.api_version}"
        
        # Required permissions for basic display
        self.scopes = [
            "user_profile",
            "user_media"
        ]
        
        # OAuth endpoints
        self.auth_base = "https://api.instagram.com"
        
        logger.info("Instagram Basic Display API initialized")

    def get_auth_url(self, state: Optional[str] = None) -> tuple[str, str]:
        """
        Generate Instagram Basic Display OAuth authorization URL
        
        Returns:
            tuple: (auth_url, state_token) for CSRF protection
        """
        if not state:
            state = secrets.token_urlsafe(32)
        
        params = {
            "client_id": self.app_id,
            "redirect_uri": self.redirect_uri,
            "scope": ",".join(self.scopes),
            "response_type": "code",
            "state": state
        }
        
        auth_url = f"{self.auth_base}/oauth/authorize?{urlencode(params)}"
        
        logger.info(f"Generated Instagram Basic Display auth URL for app: {self.app_id}")
        return auth_url, state

    def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access token
        
        Args:
            code: Authorization code from OAuth callback
            
        Returns:
            dict with access_token, token_type, expires_in
        """
        token_url = f"{self.auth_base}/oauth/access_token"
        
        params = {
            "client_id": self.app_id,
            "client_secret": self.app_secret,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
            "code": code
        }
        
        logger.info("Exchanging code for access token")
        
        try:
            response = requests.post(token_url, data=params, timeout=30)
            
            if response.status_code != 200:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get('error', {}).get('message', 'Token exchange failed')
                logger.error(f"Token exchange failed: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            data = response.json()
            
            if "error" in data:
                error_msg = data['error'].get('message', 'Token exchange failed')
                logger.error(f"Token exchange error: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            logger.info("Access token obtained successfully")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Token exchange request failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Token exchange failed: {str(e)}")

    def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        Get Instagram user information
        
        Args:
            access_token: User's access token
            
        Returns:
            dict with user info
        """
        url = f"{self.graph_base}/me"
        params = {
            "fields": "id,username,account_type,media_count",
            "access_token": access_token
        }
        
        logger.info("Fetching Instagram user info")
        
        try:
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code != 200:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get('error', {}).get('message', 'Failed to get user info')
                logger.error(f"Failed to get user info: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            data = response.json()
            
            if "error" in data:
                error_msg = data['error'].get('message', 'Failed to get user info')
                logger.error(f"Error getting user info: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            logger.info(f"User info retrieved: @{data.get('username')}")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get user info: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get user info: {str(e)}")

    def get_user_media(self, access_token: str, limit: int = 25) -> Dict[str, Any]:
        """
        Get user's media (photos and videos)
        
        Args:
            access_token: User's access token
            limit: Number of media items to retrieve
            
        Returns:
            dict with media data
        """
        url = f"{self.graph_base}/me/media"
        params = {
            "fields": "id,caption,media_type,media_url,thumbnail_url,timestamp",
            "limit": limit,
            "access_token": access_token
        }
        
        logger.info(f"Fetching user media (limit: {limit})")
        
        try:
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code != 200:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get('error', {}).get('message', 'Failed to get media')
                logger.error(f"Failed to get media: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            data = response.json()
            
            if "error" in data:
                error_msg = data['error'].get('message', 'Failed to get media')
                logger.error(f"Error getting media: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            logger.info(f"Retrieved {len(data.get('data', []))} media items")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get media: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get media: {str(e)}")

    def validate_credentials(self) -> bool:
        """Validate that required credentials are configured"""
        if not self.app_id or not self.app_secret:
            logger.error("Missing INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET")
            return False
        return True
