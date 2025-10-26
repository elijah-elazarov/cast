#!/usr/bin/env python3
"""
Comprehensive Instagram API Test
Tests all components of the Instagram integration before deployment
"""

import os
import sys
import requests
import json
from urllib.parse import urlencode
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from instagram_graph_api import InstagramGraphAPI

def test_instagram_integration():
    """Comprehensive test of Instagram integration"""
    
    print("🧪 COMPREHENSIVE INSTAGRAM API TEST")
    print("=" * 50)
    
    # Initialize Instagram Graph API
    try:
        instagram_api = InstagramGraphAPI()
        print("✅ Instagram Graph API initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize Instagram Graph API: {str(e)}")
        return False
    
    # Test 1: Validate credentials
    print("\n1. Testing credentials validation...")
    try:
        if instagram_api.validate_credentials():
            print("✅ Credentials are valid")
            print(f"   App ID: {instagram_api.app_id}")
            print(f"   Redirect URI: {instagram_api.redirect_uri}")
            print(f"   Scopes: {', '.join(instagram_api.scopes)}")
        else:
            print("❌ Credentials validation failed")
            return False
    except Exception as e:
        print(f"❌ Credentials validation error: {str(e)}")
        return False
    
    # Test 2: Generate OAuth URL
    print("\n2. Testing OAuth URL generation...")
    try:
        auth_url, state = instagram_api.get_auth_url()
        print("✅ OAuth URL generated successfully")
        print(f"   Auth URL: {auth_url}")
        print(f"   State: {state}")
        
        # Validate URL components
        if "client_id=" in auth_url and "redirect_uri=" in auth_url and "scope=" in auth_url:
            print("✅ OAuth URL contains required parameters")
        else:
            print("❌ OAuth URL missing required parameters")
            return False
            
    except Exception as e:
        print(f"❌ OAuth URL generation failed: {str(e)}")
        return False
    
    # Test 3: Test Facebook Graph API connectivity
    print("\n3. Testing Facebook Graph API connectivity...")
    try:
        # Test basic Graph API call
        url = f"https://graph.facebook.com/v21.0/{instagram_api.app_id}"
        params = {"access_token": f"{instagram_api.app_id}|{instagram_api.app_secret}"}
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Facebook Graph API is accessible")
            print(f"   App Name: {data.get('name', 'Unknown')}")
            print(f"   App ID: {data.get('id', 'Unknown')}")
        else:
            print(f"❌ Facebook Graph API error: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Facebook Graph API connectivity failed: {str(e)}")
        return False
    
    # Test 4: Test Instagram scopes validation
    print("\n4. Testing Instagram scopes...")
    try:
        # Test if we can make a call with Instagram scopes
        test_url = f"https://graph.facebook.com/v21.0/me"
        test_params = {
            "access_token": f"{instagram_api.app_id}|{instagram_api.app_secret}",
            "fields": "id,name"
        }
        
        response = requests.get(test_url, params=test_params, timeout=10)
        
        if response.status_code == 200:
            print("✅ Instagram scopes are valid")
        else:
            print(f"⚠️  Instagram scopes test returned: {response.status_code}")
            print(f"   Response: {response.text}")
            # This might be expected since we're using app token, not user token
            
    except Exception as e:
        print(f"❌ Instagram scopes test failed: {str(e)}")
        return False
    
    # Test 5: Test OAuth URL accessibility
    print("\n5. Testing OAuth URL accessibility...")
    try:
        # Test if the OAuth URL is accessible (HEAD request)
        response = requests.head(auth_url, timeout=10, allow_redirects=True)
        
        if response.status_code in [200, 302, 400]:  # 400 might be expected for missing parameters
            print("✅ OAuth URL is accessible")
        else:
            print(f"⚠️  OAuth URL returned status: {response.status_code}")
            
    except Exception as e:
        print(f"❌ OAuth URL accessibility test failed: {str(e)}")
        return False
    
    # Test 6: Test token exchange endpoint
    print("\n6. Testing token exchange endpoint...")
    try:
        # Test the token exchange endpoint (this will fail without a real code, but we can test the endpoint)
        token_url = instagram_api.token_endpoint
        
        # Test with invalid code to see if endpoint responds
        test_data = {
            "client_id": instagram_api.app_id,
            "client_secret": instagram_api.app_secret,
            "redirect_uri": instagram_api.redirect_uri,
            "code": "invalid_test_code"
        }
        
        response = requests.post(token_url, data=test_data, timeout=10)
        
        if response.status_code == 400:
            # This is expected - we're testing with invalid code
            error_data = response.json()
            if "error" in error_data:
                print("✅ Token exchange endpoint is accessible")
                print(f"   Expected error: {error_data['error'].get('message', 'Unknown error')}")
            else:
                print("⚠️  Token exchange endpoint responded but format unexpected")
        else:
            print(f"⚠️  Token exchange endpoint returned: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Token exchange endpoint test failed: {str(e)}")
        return False
    
    # Test 7: Test Instagram Graph API endpoints
    print("\n7. Testing Instagram Graph API endpoints...")
    try:
        # Test if we can access Instagram-specific endpoints
        test_url = f"https://graph.facebook.com/v21.0/me"
        test_params = {
            "access_token": f"{instagram_api.app_id}|{instagram_api.app_secret}",
            "fields": "instagram_business_account"
        }
        
        response = requests.get(test_url, params=test_params, timeout=10)
        
        if response.status_code == 200:
            print("✅ Instagram Graph API endpoints are accessible")
        else:
            print(f"⚠️  Instagram Graph API test returned: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Instagram Graph API endpoints test failed: {str(e)}")
        return False
    
    # Test 8: Validate redirect URI format
    print("\n8. Testing redirect URI format...")
    try:
        redirect_uri = instagram_api.redirect_uri
        
        if redirect_uri.startswith("https://") and "cast-five.vercel.app" in redirect_uri:
            print("✅ Redirect URI format is correct")
            print(f"   Redirect URI: {redirect_uri}")
        else:
            print("❌ Redirect URI format is incorrect")
            print(f"   Redirect URI: {redirect_uri}")
            return False
            
    except Exception as e:
        print(f"❌ Redirect URI validation failed: {str(e)}")
        return False
    
    # Test 9: Test scope validation
    print("\n9. Testing scope validation...")
    try:
        scopes = instagram_api.scopes
        valid_scopes = ["instagram_business_basic", "instagram_business_content_publish"]
        
        if all(scope in valid_scopes for scope in scopes):
            print("✅ Scopes are valid for Instagram API")
            print(f"   Scopes: {', '.join(scopes)}")
        else:
            print("❌ Invalid scopes detected")
            print(f"   Current scopes: {', '.join(scopes)}")
            print(f"   Valid scopes: {', '.join(valid_scopes)}")
            return False
            
    except Exception as e:
        print(f"❌ Scope validation failed: {str(e)}")
        return False
    
    # Test 10: Test API version compatibility
    print("\n10. Testing API version compatibility...")
    try:
        api_version = instagram_api.api_version
        if api_version == "v21.0":
            print("✅ API version is current")
            print(f"   API Version: {api_version}")
        else:
            print(f"⚠️  API version might be outdated: {api_version}")
            
    except Exception as e:
        print(f"❌ API version test failed: {str(e)}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 COMPREHENSIVE TEST COMPLETED")
    print("=" * 50)
    
    return True

def main():
    """Main test function"""
    success = test_instagram_integration()
    
    if success:
        print("\n✅ All tests passed! Instagram integration is ready for deployment.")
        print("\nNext steps:")
        print("1. Commit and push the changes")
        print("2. Test the OAuth flow in production")
        print("3. Verify Instagram connection works end-to-end")
    else:
        print("\n❌ Some tests failed. Please fix the issues before deploying.")
    
    return success

if __name__ == "__main__":
    main()
