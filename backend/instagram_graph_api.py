"""
Instagram Graph API Integration - 2025
Modern web-based Instagram authentication and content publishing
Supports Instagram Business/Creator accounts only
"""

import os
import requests
import logging
import uuid
import time
import secrets
from typing import Dict, Optional, Any
from fastapi import HTTPException
from urllib.parse import urlencode
from file_upload_service import FileUploadService

logger = logging.getLogger(__name__)


class InstagramGraphAPI:
    """
    Instagram Graph API integration for web-based authentication and Reels publishing
    Requires: Instagram Business or Creator account with Facebook Page connection
    """
    
    def __init__(self):
        # Facebook App Configuration (required for Instagram Graph API)
        self.app_id = os.getenv("FACEBOOK_APP_ID")
        self.app_secret = os.getenv("FACEBOOK_APP_SECRET")
        self.redirect_uri = os.getenv("INSTAGRAM_REDIRECT_URI", "http://localhost:3000/auth/instagram/callback")
        
        if not self.app_id or not self.app_secret:
            logger.warning("Instagram Graph API: Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET")
        
        # API Configuration
        self.api_version = "v21.0"
        self.graph_base = f"https://graph.facebook.com/{self.api_version}"
        
        # Required permissions for Instagram publishing (Facebook Login for Business)
        self.scopes = [
            "instagram_basic",
            "pages_show_list",
            "pages_read_engagement",
            "business_management",
            "instagram_content_publish",
            "instagram_manage_comments",
            "instagram_manage_insights"
        ]
        
        # OAuth endpoints - Use Facebook OAuth with Instagram scopes
        self.auth_base = "https://www.facebook.com"
        self.token_endpoint = f"{self.graph_base}/oauth/access_token"
        
        logger.info("Instagram Graph API initialized")

    def get_auth_url(self, state: Optional[str] = None) -> tuple[str, str]:
        """
        Generate Instagram OAuth authorization URL
        
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
            "state": state,
            "auth_type": "rerequest"  # Force re-consent to ensure permissions
        }
        
        auth_url = f"{self.auth_base}/{self.api_version}/dialog/oauth?{urlencode(params)}"
        
        logger.info(f"Generated Instagram auth URL for app: {self.app_id}")
        return auth_url, state

    def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access token
        
        Args:
            code: Authorization code from OAuth callback
            
        Returns:
            dict with access_token, token_type, expires_in
        """
        # Use Facebook Graph API token endpoint
        token_url = self.token_endpoint
        
        params = {
            "client_id": self.app_id,
            "client_secret": self.app_secret,
            "redirect_uri": self.redirect_uri,
            "code": code,
            "grant_type": "authorization_code"
        }
        
        logger.info("Exchanging code for access token")
        logger.info(f"Code received: {code[:10]}...{code[-10:] if len(code) > 20 else code}")
        logger.info(f"Code length: {len(code)}")
        logger.info(f"Token endpoint: {token_url}")
        logger.info(f"Redirect URI: {self.redirect_uri}")
        logger.info(f"Client ID: {self.app_id}")
        logger.info(f"Request params: {dict(params)}")
        
        # Validate code format
        if not code or len(code) < 10:
            logger.error(f"Invalid code format: too short ({len(code)} chars)")
            raise HTTPException(status_code=400, detail="Invalid verification code format.")
        
        if not code.replace('-', '').replace('_', '').isalnum():
            logger.error(f"Invalid code format: contains invalid characters")
            raise HTTPException(status_code=400, detail="Invalid verification code format.")
        
        try:
            response = requests.post(token_url, data=params, timeout=30)
            
            logger.info(f"Facebook response status: {response.status_code}")
            logger.info(f"Facebook response: {response.text}")
            
            if response.status_code != 200:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get('error', {}).get('message', 'Token exchange failed')
                error_code = error_data.get('error', {}).get('code', 'unknown')
                logger.error(f"Token exchange failed: {error_msg} (Code: {error_code})")
                logger.error(f"Full error response: {error_data}")
                raise HTTPException(status_code=400, detail=f"Token exchange failed: {error_msg}")
            
            data = response.json()
            
            if "error" in data:
                error_msg = data['error'].get('message', 'Token exchange failed')
                error_code = data['error'].get('code', 'unknown')
                logger.error(f"Token exchange error in response: {error_msg} (Code: {error_code})")
                logger.error(f"Full error data: {data['error']}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            logger.info("Access token obtained successfully")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Token exchange request failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Token exchange failed: {str(e)}")

    def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        Get basic user information to validate the access token
        
        Args:
            access_token: User's access token
            
        Returns:
            dict with user data
        """
        url = f"{self.graph_base}/me"
        params = {
            "access_token": access_token,
            "fields": "id,name,email"
        }
        
        logger.info("Validating access token with user info")
        
        try:
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code != 200:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get('error', {}).get('message', 'Invalid access token')
                logger.error(f"Access token validation failed: {error_msg}")
                raise HTTPException(status_code=400, detail=f"Invalid access token: {error_msg}")
            
            data = response.json()
            logger.info(f"User info retrieved: {data.get('name', 'Unknown')} (ID: {data.get('id', 'Unknown')})")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to validate access token: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to validate access token: {str(e)}")

    def get_user_pages(self, access_token: str) -> Dict[str, Any]:
        """
        Get Facebook Pages for the user (required for Instagram Graph API)
        
        Args:
            access_token: User's access token
            
        Returns:
            dict with Facebook Pages data
        """
        url = f"{self.graph_base}/me/accounts"
        params = {
            "access_token": access_token,
            "fields": "id,name,access_token,instagram_business_account"
        }
        
        logger.info("Fetching user's Facebook Pages (Instagram Graph API)")
        logger.info(f"Request URL: {url}")
        logger.info(f"Request params: {params}")
        
        try:
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code != 200:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get('error', {}).get('message', 'Failed to get Facebook Pages')
                logger.error(f"Failed to get Facebook Pages: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            data = response.json()
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response data: {data}")
            
            if "error" in data:
                error_msg = data['error'].get('message', 'Failed to get Facebook Pages')
                logger.error(f"Error getting Facebook Pages: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            # Check if user has any pages
            if not data.get('data'):
                logger.warning("No Facebook Pages found for user")
                raise HTTPException(
                    status_code=404,
                    detail="No Facebook Pages found. Please ensure you have a Facebook Page and that your Instagram Business account is connected to it."
                )
            
            # Filter pages that have Instagram Business accounts
            pages_with_instagram = []
            for page in data['data']:
                if page.get('instagram_business_account'):
                    pages_with_instagram.append(page)
            
            if not pages_with_instagram:
                logger.warning("No Facebook Pages with Instagram Business accounts found")
                logger.info(f"Available pages: {[page.get('name', 'Unknown') for page in data['data']]}")
                raise HTTPException(
                    status_code=404,
                    detail="No Facebook Pages with Instagram Business accounts found. Please ensure: 1) Your Instagram account is Business or Creator type, 2) It's connected to a Facebook Page, 3) You're logged in as the Page admin."
                )
            
            logger.info(f"Found {len(pages_with_instagram)} Facebook Pages with Instagram Business accounts")
            
            return {
                "data": pages_with_instagram
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get Facebook Pages: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get Facebook Pages: {str(e)}")

    def get_instagram_account_from_page(self, page_id: str, page_access_token: str) -> Dict[str, Any]:
        """
        Get Instagram Business account from Facebook Page
        
        Args:
            page_id: Facebook Page ID
            page_access_token: Facebook Page access token
            
        Returns:
            dict with Instagram account data
        """
        url = f"{self.graph_base}/{page_id}"
        params = {
            "fields": "instagram_business_account{id,username}",
            "access_token": page_access_token
        }
        
        logger.info(f"Fetching Instagram account for Facebook Page: {page_id}")
        
        try:
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code != 200:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get('error', {}).get('message', 'Failed to get Instagram account')
                logger.error(f"Failed to get Instagram account: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            data = response.json()
            
            if "error" in data:
                error_msg = data['error'].get('message', 'Failed to get Instagram account')
                logger.error(f"Error getting Instagram account: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            if 'instagram_business_account' not in data:
                logger.warning(f"No Instagram account found for Facebook Page: {page_id}")
                raise HTTPException(
                    status_code=404,
                    detail="No Instagram Business account found for this Facebook Page. Please ensure your Instagram account is a Business or Creator account and is connected to this Facebook Page."
                )
            
            instagram_account = data['instagram_business_account']
            logger.info(f"Instagram account found: {instagram_account.get('username')}")
            return instagram_account
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get Instagram account: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get Instagram account: {str(e)}")

    def get_instagram_user_info(self, ig_user_id: str, access_token: str) -> Dict[str, Any]:
        """
        Get Instagram user information
        
        Args:
            ig_user_id: Instagram user ID
            access_token: Page access token
            
        Returns:
            dict with user info
        """
        url = f"{self.graph_base}/{ig_user_id}"
        params = {
            "fields": "id,username,followers_count,media_count",
            "access_token": access_token
        }
        
        logger.info(f"Fetching Instagram user info: {ig_user_id}")
        
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

    def create_reel_container(self, ig_user_id: str, access_token: str, video_url: str, caption: str = "") -> str:
        """
        Create Instagram Reel media container
        
        Args:
            ig_user_id: Instagram user ID
            access_token: Page access token
            video_url: Public HTTPS URL to the video file
            caption: Caption for the Reel
            
        Returns:
            Container ID (creation_id)
        """
        url = f"{self.graph_base}/{ig_user_id}/media"
        
        params = {
            "video_url": video_url,
            "caption": caption,
            "media_type": "REELS",
            "access_token": access_token
        }
        
        logger.info(f"Creating Reel container for user: {ig_user_id}")
        
        try:
            response = requests.post(url, data=params, timeout=30)
            
            if response.status_code != 200:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get('error', {}).get('message', 'Failed to create media container')
                logger.error(f"Failed to create container: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            data = response.json()
            
            if "error" in data:
                error_msg = data['error'].get('message', 'Failed to create media container')
                logger.error(f"Error creating container: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            container_id = data.get('id')
            if not container_id:
                logger.error("No container ID returned")
                raise HTTPException(status_code=400, detail="No container ID returned")
            
            logger.info(f"Reel container created: {container_id}")
            return container_id
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to create container: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create container: {str(e)}")

    def publish_reel(self, ig_user_id: str, access_token: str, creation_id: str) -> Dict[str, Any]:
        """
        Publish Instagram Reel from container
        
        Args:
            ig_user_id: Instagram user ID
            access_token: Page access token
            creation_id: Container/creation ID from create_reel_container
            
        Returns:
            Published media data
        """
        url = f"{self.graph_base}/{ig_user_id}/media_publish"
        
        params = {
            "creation_id": creation_id,
            "access_token": access_token
        }
        
        logger.info(f"Publishing Reel: {creation_id}")
        
        try:
            response = requests.post(url, data=params, timeout=30)
            
            if response.status_code != 200:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get('error', {}).get('message', 'Failed to publish Reel')
                logger.error(f"Failed to publish Reel: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            data = response.json()
            
            if "error" in data:
                error_msg = data['error'].get('message', 'Failed to publish Reel')
                logger.error(f"Error publishing Reel: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            logger.info(f"Reel published successfully: {data.get('id')}")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to publish Reel: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to publish Reel: {str(e)}")

    def upload_and_publish_reel(self, ig_user_id: str, access_token: str, video_file, caption: str = "") -> Dict[str, Any]:
        """
        Upload and publish Instagram Reel
        
        Args:
            ig_user_id: Instagram Business account ID
            access_token: Facebook Page access token
            video_file: Video file object
            caption: Reel caption
            
        Returns:
            dict with published reel data
        """
        try:
            logger.info(f"Processing Reel upload for user: {ig_user_id}")
            logger.info(f"Caption: {caption}")
            
            # Step 1: Upload video file to cloud storage
            file_upload_service = FileUploadService()
            
            # Read file content
            video_file.seek(0)  # Reset file pointer
            file_content = video_file.read()
            
            # Upload to cloud storage and get public URL
            media_url = file_upload_service.upload_video(
                file_content=file_content,
                filename=f"reel_{ig_user_id}_{int(time.time())}.mp4",
                content_type="video/mp4"
            )
            
            logger.info(f"Video uploaded to cloud storage: {media_url}")
            
            # Step 2: Create Reel container using Instagram Graph API
            container_id = self.create_reel_container(
                ig_user_id=ig_user_id,
                access_token=access_token,
                video_url=media_url,
                caption=caption
            )
            
            # Step 3: Publish the Reel
            published_reel = self.publish_reel(
                ig_user_id=ig_user_id,
                access_token=access_token,
                creation_id=container_id
            )
            
            logger.info(f"Reel uploaded and published successfully: {published_reel.get('id')}")
            
            return {
                "media_id": published_reel.get('id'),
                "container_id": container_id,
                "media_type": "REELS",
                "status": "published",
                "message": "Reel published successfully",
                "video_url": media_url
            }
            
        except Exception as e:
            logger.error(f"Failed to upload and publish reel: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Reel upload failed: {str(e)}")

    def create_story_container(self, ig_user_id: str, access_token: str, media_url: str, media_type: str, caption: str = "") -> str:
        """
        Create Instagram Story media container
        
        Args:
            ig_user_id: Instagram user ID
            access_token: Page access token
            media_url: Public HTTPS URL to the media file
            media_type: "VIDEO" or "IMAGE"
            caption: Caption for the Story
            
        Returns:
            Container ID (creation_id)
        """
        url = f"{self.graph_base}/{ig_user_id}/media"
        
        params = {
            "media_url": media_url,
            "caption": caption,
            "media_type": media_type,
            "access_token": access_token
        }
        
        logger.info(f"Creating Story container for user: {ig_user_id}")
        
        try:
            response = requests.post(url, data=params, timeout=30)
            
            if response.status_code != 200:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get('error', {}).get('message', 'Failed to create media container')
                logger.error(f"Failed to create container: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            data = response.json()
            
            if "error" in data:
                error_msg = data['error'].get('message', 'Failed to create media container')
                logger.error(f"Error creating container: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            container_id = data.get('id')
            if not container_id:
                logger.error("No container ID returned")
                raise HTTPException(status_code=400, detail="No container ID returned")
            
            logger.info(f"Story container created: {container_id}")
            return container_id
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to create container: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create container: {str(e)}")

    def publish_story(self, ig_user_id: str, access_token: str, creation_id: str) -> Dict[str, Any]:
        """
        Publish Instagram Story from container
        
        Args:
            ig_user_id: Instagram user ID
            access_token: Page access token
            creation_id: Container/creation ID from create_story_container
            
        Returns:
            Published media data
        """
        url = f"{self.graph_base}/{ig_user_id}/media_publish"
        
        params = {
            "creation_id": creation_id,
            "access_token": access_token
        }
        
        logger.info(f"Publishing Story: {creation_id}")
        
        try:
            response = requests.post(url, data=params, timeout=30)
            
            if response.status_code != 200:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get('error', {}).get('message', 'Failed to publish Story')
                logger.error(f"Failed to publish Story: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            data = response.json()
            
            if "error" in data:
                error_msg = data['error'].get('message', 'Failed to publish Story')
                logger.error(f"Error publishing Story: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            logger.info(f"Story published successfully: {data.get('id')}")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to publish Story: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to publish Story: {str(e)}")

    def upload_and_publish_story(self, ig_user_id: str, access_token: str, video_file, caption: str = "") -> Dict[str, Any]:
        """
        Upload and publish Instagram Story
        
        Args:
            ig_user_id: Instagram Business account ID
            access_token: Facebook Page access token
            video_file: Video file object
            caption: Story caption
            
        Returns:
            dict with published story data
        """
        try:
            logger.info(f"Processing Story upload for user: {ig_user_id}")
            logger.info(f"Caption: {caption}")
            
            # Step 1: Upload video file to cloud storage
            file_upload_service = FileUploadService()
            
            # Read file content
            video_file.seek(0)  # Reset file pointer
            file_content = video_file.read()
            
            # Upload to cloud storage and get public URL
            media_url = file_upload_service.upload_video(
                file_content=file_content,
                filename=f"story_{ig_user_id}_{int(time.time())}.mp4",
                content_type="video/mp4"
            )
            
            logger.info(f"Video uploaded to cloud storage: {media_url}")
            
            # Step 2: Create Story container using Instagram Graph API
            container_id = self.create_story_container(
                ig_user_id=ig_user_id,
                access_token=access_token,
                media_url=media_url,
                media_type="VIDEO",
                caption=caption
            )
            
            # Step 3: Publish the Story
            published_story = self.publish_story(
                ig_user_id=ig_user_id,
                access_token=access_token,
                creation_id=container_id
            )
            
            logger.info(f"Story uploaded and published successfully: {published_story.get('id')}")
            
            return {
                "media_id": published_story.get('id'),
                "container_id": container_id,
                "media_type": "VIDEO",
                "status": "published",
                "message": "Story published successfully",
                "video_url": media_url
            }
            
        except Exception as e:
            logger.error(f"Failed to upload and publish story: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Story upload failed: {str(e)}")

    def get_long_lived_token(self, short_lived_token: str) -> str:
        """
        Exchange a short-lived access token for a long-lived token.

        Args:
            short_lived_token: Short-lived user access token returned from the OAuth code exchange step.

        Returns:
            A long-lived access token string.
        """
        url = f"{self.graph_base}/oauth/access_token"
        params = {
            "grant_type": "fb_exchange_token",
            "client_id": self.app_id,
            "client_secret": self.app_secret,
            "fb_exchange_token": short_lived_token,
        }

        logger.info("Exchanging short-lived token for long-lived token")
        try:
            response = requests.get(url, params=params, timeout=30)
            logger.info(f"Long-lived token response status: {response.status_code}")
            logger.debug(f"Long-lived token response body: {response.text}")

            if response.status_code != 200:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get("error", {}).get("message", "Failed to get long-lived token")
                raise HTTPException(status_code=400, detail=error_msg)

            data: Dict[str, Any] = response.json()
            if "error" in data:
                error_msg = data["error"].get("message", "Failed to get long-lived token")
                raise HTTPException(status_code=400, detail=error_msg)

            long_lived_token = data.get("access_token")
            if not long_lived_token:
                raise HTTPException(status_code=400, detail="No long-lived token returned")

            expires_in = data.get("expires_in", 0)
            logger.info(f"Obtained long-lived token. Expires in {expires_in} seconds")
            return long_lived_token
        except requests.exceptions.RequestException as exc:
            logger.error(f"Error exchanging long-lived token: {exc}")
            raise HTTPException(status_code=500, detail=f"Failed to get long-lived token: {exc}")

    def get_user_instagram_account(self, access_token: str) -> Dict[str, Any]:
        """
        Attempt to fetch the Instagram Business account directly from the user node.  
        This works if the Facebook user account is the owner of exactly one Instagram Business account.
        """
        url = f"{self.graph_base}/me"
        params = {
            "fields": "instagram_business_account{id,username}",
            "access_token": access_token,
        }
        logger.info("Fetching Instagram Business account directly from user profile")
        try:
            response = requests.get(url, params=params, timeout=30)
            if response.status_code != 200:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get("error", {}).get("message", "Failed to get Instagram account")
                raise HTTPException(status_code=400, detail=error_msg)

            data: Dict[str, Any] = response.json()
            if "error" in data:
                error_msg = data["error"].get("message", "Failed to get Instagram account")
                raise HTTPException(status_code=400, detail=error_msg)

            return data
        except requests.exceptions.RequestException as exc:
            logger.error(f"Error fetching Instagram account from user: {exc}")
            raise HTTPException(status_code=500, detail=f"Failed to get Instagram account: {exc}")

    # Backwards-compatibility helper. main.py expects get_instagram_account(...)
    def get_instagram_account(self, page_id: str, page_access_token: str) -> Dict[str, Any]:
        """Wrapper around get_instagram_account_from_page for legacy usage."""
        return self.get_instagram_account_from_page(page_id, page_access_token)

    def validate_credentials(self) -> bool:
        """Validate that required credentials are configured"""
        if not self.app_id or not self.app_secret:
            logger.error("Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET")
            return False
        return True
