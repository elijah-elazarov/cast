#!/usr/bin/env python3
"""
Instagram Graph API Connection Debug Script

This script helps debug Instagram Graph API connections by testing various endpoints
and logging detailed information about what's available.
"""

import os
import sys
import requests
import json
from typing import Dict, Any, Optional
import logging

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from instagram_graph_api import InstagramGraphAPI

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class InstagramConnectionDebugger:
    def __init__(self):
        self.instagram_api = InstagramGraphAPI()
        self.access_token = None
        self.user_info = None
        self.pages_data = None
        
    def test_credentials(self):
        """Test if Instagram Graph API credentials are properly configured"""
        logger.info("=" * 60)
        logger.info("TESTING INSTAGRAM GRAPH API CREDENTIALS")
        logger.info("=" * 60)
        
        if not self.instagram_api.validate_credentials():
            logger.error("❌ Instagram Graph API credentials not configured properly")
            return False
            
        logger.info("✅ Instagram Graph API credentials are configured")
        logger.info(f"   App ID: {self.instagram_api.app_id}")
        logger.info(f"   Redirect URI: {self.instagram_api.redirect_uri}")
        logger.info(f"   Scopes: {', '.join(self.instagram_api.scopes)}")
        return True
    
    def test_auth_url_generation(self):
        """Test OAuth URL generation"""
        logger.info("\n" + "=" * 60)
        logger.info("TESTING OAUTH URL GENERATION")
        logger.info("=" * 60)
        
        try:
            auth_url, state = self.instagram_api.get_auth_url()
            logger.info("✅ OAuth URL generated successfully")
            logger.info(f"   Auth URL: {auth_url}")
            logger.info(f"   State: {state}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to generate OAuth URL: {str(e)}")
            return False
    
    def test_access_token_validation(self, access_token: str):
        """Test access token validation and get user info"""
        logger.info("\n" + "=" * 60)
        logger.info("TESTING ACCESS TOKEN VALIDATION")
        logger.info("=" * 60)
        
        try:
            self.user_info = self.instagram_api.get_user_info(access_token)
            logger.info("✅ Access token is valid")
            logger.info(f"   User ID: {self.user_info.get('id', 'Unknown')}")
            logger.info(f"   User Name: {self.user_info.get('name', 'Unknown')}")
            logger.info(f"   User Email: {self.user_info.get('email', 'Not provided')}")
            self.access_token = access_token
            return True
        except Exception as e:
            logger.error(f"❌ Access token validation failed: {str(e)}")
            return False
    
    def test_facebook_pages_retrieval(self):
        """Test Facebook Pages retrieval"""
        logger.info("\n" + "=" * 60)
        logger.info("TESTING FACEBOOK PAGES RETRIEVAL")
        logger.info("=" * 60)
        
        if not self.access_token:
            logger.error("❌ No access token available for testing")
            return False
            
        try:
            self.pages_data = self.instagram_api.get_user_pages(self.access_token)
            pages = self.pages_data.get('data', [])
            
            logger.info(f"✅ Found {len(pages)} Facebook pages")
            
            for i, page in enumerate(pages):
                logger.info(f"\n   Page {i+1}:")
                logger.info(f"     Name: {page.get('name', 'Unknown')}")
                logger.info(f"     ID: {page.get('id', 'Unknown')}")
                logger.info(f"     Access Token: {'Present' if page.get('access_token') else 'Missing'}")
                
                # Check Instagram connection
                ig_account = page.get('instagram_business_account')
                if ig_account:
                    logger.info(f"     ✅ Instagram Business Account Connected:")
                    logger.info(f"       Instagram ID: {ig_account.get('id', 'Unknown')}")
                    logger.info(f"       Instagram Data: {json.dumps(ig_account, indent=6)}")
                else:
                    logger.info(f"     ❌ No Instagram Business Account connected")
            
            return True
        except Exception as e:
            logger.error(f"❌ Failed to retrieve Facebook pages: {str(e)}")
            return False
    
    def test_instagram_account_info(self, page_id: str, page_access_token: str):
        """Test Instagram account information retrieval"""
        logger.info("\n" + "=" * 60)
        logger.info("TESTING INSTAGRAM ACCOUNT INFO RETRIEVAL")
        logger.info("=" * 60)
        
        try:
            # Get Instagram account from page
            instagram_account = self.instagram_api.get_instagram_account_from_page(page_id, page_access_token)
            ig_user_id = instagram_account['id']
            
            logger.info("✅ Instagram account retrieved from page")
            logger.info(f"   Instagram User ID: {ig_user_id}")
            logger.info(f"   Instagram Account Data: {json.dumps(instagram_account, indent=4)}")
            
            # Get detailed Instagram account info
            ig_info = self.instagram_api.get_instagram_user_info(ig_user_id, page_access_token)
            
            logger.info("✅ Detailed Instagram account info retrieved")
            logger.info(f"   Username: {ig_info.get('username', 'Unknown')}")
            logger.info(f"   Followers Count: {ig_info.get('followers_count', 0)}")
            logger.info(f"   Media Count: {ig_info.get('media_count', 0)}")
            logger.info(f"   Account Type: {ig_info.get('account_type', 'Unknown')}")
            logger.info(f"   Full Instagram Info: {json.dumps(ig_info, indent=4)}")
            
            return True
        except Exception as e:
            logger.error(f"❌ Failed to retrieve Instagram account info: {str(e)}")
            return False
    
    def test_instagram_media_retrieval(self, ig_user_id: str, page_access_token: str):
        """Test Instagram media retrieval"""
        logger.info("\n" + "=" * 60)
        logger.info("TESTING INSTAGRAM MEDIA RETRIEVAL")
        logger.info("=" * 60)
        
        try:
            # Get recent media
            media_url = f"{self.instagram_api.graph_base}/{ig_user_id}/media"
            params = {
                "access_token": page_access_token,
                "fields": "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp"
            }
            
            response = requests.get(media_url, params=params, timeout=30)
            
            if response.status_code == 200:
                media_data = response.json()
                media_items = media_data.get('data', [])
                
                logger.info(f"✅ Retrieved {len(media_items)} media items")
                
                for i, media in enumerate(media_items[:5]):  # Show first 5 items
                    logger.info(f"\n   Media {i+1}:")
                    logger.info(f"     ID: {media.get('id', 'Unknown')}")
                    logger.info(f"     Type: {media.get('media_type', 'Unknown')}")
                    logger.info(f"     Caption: {media.get('caption', 'No caption')[:100]}...")
                    logger.info(f"     Timestamp: {media.get('timestamp', 'Unknown')}")
                    logger.info(f"     Permalink: {media.get('permalink', 'No permalink')}")
            else:
                logger.error(f"❌ Failed to retrieve media: {response.status_code} - {response.text}")
                return False
                
            return True
        except Exception as e:
            logger.error(f"❌ Failed to retrieve Instagram media: {str(e)}")
            return False
    
    def test_posting_capabilities(self, ig_user_id: str, page_access_token: str):
        """Test posting capabilities (without actually posting)"""
        logger.info("\n" + "=" * 60)
        logger.info("TESTING POSTING CAPABILITIES")
        logger.info("=" * 60)
        
        try:
            # Test if we can create a media container (without actually posting)
            test_media_url = "https://example.com/test.jpg"  # Dummy URL for testing
            
            # Test Reel container creation
            try:
                container_id = self.instagram_api.create_reel_container(
                    ig_user_id, 
                    page_access_token, 
                    test_media_url, 
                    "Test caption"
                )
                logger.info(f"✅ Reel container creation test passed (ID: {container_id})")
            except Exception as e:
                logger.warning(f"⚠️  Reel container creation test failed: {str(e)}")
            
            # Test Story container creation
            try:
                story_container_id = self.instagram_api.create_story_container(
                    ig_user_id, 
                    page_access_token, 
                    test_media_url, 
                    "IMAGE", 
                    "Test story caption"
                )
                logger.info(f"✅ Story container creation test passed (ID: {story_container_id})")
            except Exception as e:
                logger.warning(f"⚠️  Story container creation test failed: {str(e)}")
            
            return True
        except Exception as e:
            logger.error(f"❌ Posting capabilities test failed: {str(e)}")
            return False
    
    def run_full_debug(self, access_token: Optional[str] = None):
        """Run full debug process"""
        logger.info("🚀 STARTING INSTAGRAM CONNECTION DEBUG")
        logger.info("=" * 80)
        
        # Test 1: Credentials
        if not self.test_credentials():
            return False
        
        # Test 2: Auth URL generation
        if not self.test_auth_url_generation():
            return False
        
        # Test 3: Access token validation (if provided)
        if access_token:
            if not self.test_access_token_validation(access_token):
                return False
            
            # Test 4: Facebook Pages retrieval
            if not self.test_facebook_pages_retrieval():
                return False
            
            # Test 5: Instagram account info (if pages available)
            if self.pages_data and self.pages_data.get('data'):
                pages = self.pages_data['data']
                pages_with_instagram = [page for page in pages if page.get('instagram_business_account')]
                
                if pages_with_instagram:
                    page = pages_with_instagram[0]  # Use first page with Instagram
                    page_id = page['id']
                    page_access_token = page['access_token']
                    
                    # Test Instagram account info
                    if self.test_instagram_account_info(page_id, page_access_token):
                        ig_user_id = page['instagram_business_account']['id']
                        
                        # Test media retrieval
                        self.test_instagram_media_retrieval(ig_user_id, page_access_token)
                        
                        # Test posting capabilities
                        self.test_posting_capabilities(ig_user_id, page_access_token)
                else:
                    logger.warning("⚠️  No pages with Instagram Business accounts found")
            else:
                logger.warning("⚠️  No Facebook pages found")
        else:
            logger.info("ℹ️  No access token provided - skipping token-dependent tests")
            logger.info("   To test with an access token, run:")
            logger.info("   python debug_instagram_connection.py <access_token>")
        
        logger.info("\n" + "=" * 80)
        logger.info("🏁 DEBUG COMPLETE")
        logger.info("=" * 80)
        
        return True

def main():
    """Main function"""
    debugger = InstagramConnectionDebugger()
    
    # Get access token from command line argument if provided
    access_token = sys.argv[1] if len(sys.argv) > 1 else None
    
    if access_token:
        logger.info(f"Using provided access token: {access_token[:10]}...")
    else:
        logger.info("No access token provided - will only test basic functionality")
    
    # Run debug
    debugger.run_full_debug(access_token)

if __name__ == "__main__":
    main()
