#!/usr/bin/env python3
"""
Test Instagram OAuth Flow Script

This script simulates the OAuth flow and provides detailed logging
about what's happening at each step.
"""

import os
import sys
import requests
import json
import logging
from typing import Dict, Any

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from instagram_graph_api import InstagramGraphAPI

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_oauth_flow_with_code(authorization_code: str):
    """Test the complete OAuth flow with an authorization code"""
    
    logger.info("🚀 TESTING INSTAGRAM OAUTH FLOW")
    logger.info("=" * 50)
    
    # Initialize Instagram Graph API
    instagram_api = InstagramGraphAPI()
    
    try:
        # Step 1: Exchange code for access token
        logger.info("Step 1: Exchanging authorization code for access token...")
        token_data = instagram_api.exchange_code_for_token(authorization_code)
        access_token = token_data['access_token']
        logger.info(f"✅ Access token obtained: {access_token[:20]}...")
        
        # Step 2: Get user info
        logger.info("\nStep 2: Getting user information...")
        user_info = instagram_api.get_user_info(access_token)
        logger.info(f"✅ User info retrieved:")
        logger.info(f"   Name: {user_info.get('name', 'Unknown')}")
        logger.info(f"   ID: {user_info.get('id', 'Unknown')}")
        logger.info(f"   Email: {user_info.get('email', 'Not provided')}")
        
        # Step 3: Get Facebook Pages
        logger.info("\nStep 3: Getting Facebook Pages...")
        pages_data = instagram_api.get_user_pages(access_token)
        pages = pages_data.get('data', [])
        
        logger.info(f"✅ Found {len(pages)} Facebook pages:")
        
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
            else:
                logger.info(f"     ❌ No Instagram Business Account connected")
        
        # Step 4: Test Instagram account info (if available)
        pages_with_instagram = [page for page in pages if page.get('instagram_business_account')]
        
        if pages_with_instagram:
            logger.info(f"\nStep 4: Testing Instagram account info...")
            page = pages_with_instagram[0]
            page_id = page['id']
            page_access_token = page['access_token']
            
            # Get Instagram account from page
            instagram_account = instagram_api.get_instagram_account_from_page(page_id, page_access_token)
            ig_user_id = instagram_account['id']
            
            logger.info(f"✅ Instagram account retrieved:")
            logger.info(f"   Instagram User ID: {ig_user_id}")
            
            # Get detailed Instagram account info
            ig_info = instagram_api.get_instagram_user_info(ig_user_id, page_access_token)
            
            logger.info(f"✅ Detailed Instagram account info:")
            logger.info(f"   Username: {ig_info.get('username', 'Unknown')}")
            logger.info(f"   Followers: {ig_info.get('followers_count', 0)}")
            logger.info(f"   Media Count: {ig_info.get('media_count', 0)}")
            logger.info(f"   Account Type: {ig_info.get('account_type', 'Unknown')}")
            
            # Test media retrieval
            logger.info(f"\nStep 5: Testing media retrieval...")
            try:
                media_url = f"{instagram_api.graph_base}/{ig_user_id}/media"
                params = {
                    "access_token": page_access_token,
                    "fields": "id,caption,media_type,media_url,permalink,timestamp"
                }
                
                response = requests.get(media_url, params=params, timeout=30)
                
                if response.status_code == 200:
                    media_data = response.json()
                    media_items = media_data.get('data', [])
                    logger.info(f"✅ Retrieved {len(media_items)} media items")
                    
                    if media_items:
                        logger.info(f"   Latest media:")
                        latest = media_items[0]
                        logger.info(f"     ID: {latest.get('id', 'Unknown')}")
                        logger.info(f"     Type: {latest.get('media_type', 'Unknown')}")
                        logger.info(f"     Caption: {latest.get('caption', 'No caption')[:100]}...")
                else:
                    logger.warning(f"⚠️  Media retrieval failed: {response.status_code}")
            except Exception as e:
                logger.warning(f"⚠️  Media retrieval error: {str(e)}")
            
            logger.info(f"\n🎉 OAUTH FLOW TEST COMPLETED SUCCESSFULLY!")
            logger.info(f"   Instagram Account: @{ig_info.get('username', 'Unknown')}")
            logger.info(f"   Followers: {ig_info.get('followers_count', 0)}")
            logger.info(f"   Ready for posting!")
            
        else:
            logger.warning("⚠️  No pages with Instagram Business accounts found")
            logger.info("   This means your Instagram account is not properly connected to a Facebook Page")
            logger.info("   Please ensure your Instagram Business account is connected to a Facebook Page")
        
    except Exception as e:
        logger.error(f"❌ OAuth flow test failed: {str(e)}")
        return False
    
    return True

def main():
    """Main function"""
    if len(sys.argv) != 2:
        print("Usage: python test_oauth_flow.py <authorization_code>")
        print("")
        print("To get an authorization code:")
        print("1. Go to your app: https://cast-five.vercel.app")
        print("2. Click 'Connect with Instagram'")
        print("3. Complete the OAuth flow")
        print("4. Copy the 'code' parameter from the callback URL")
        print("5. Run this script with that code")
        sys.exit(1)
    
    authorization_code = sys.argv[1]
    test_oauth_flow_with_code(authorization_code)

if __name__ == "__main__":
    main()
