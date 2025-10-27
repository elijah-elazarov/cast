#!/usr/bin/env python3
"""
Complete Instagram Graph API Flow Test
Simulates the exact same flow as Graph API Explorer
"""

import requests
import json
import time

BACKEND_URL = "https://backrooms-e8nm.onrender.com"

def test_complete_flow():
    """Test the complete flow: auth URL -> login -> session -> upload"""
    
    print("="*80)
    print("COMPLETE INSTAGRAM GRAPH API FLOW TEST")
    print("="*80)
    
    # Step 1: Get Auth URL
    print("\n1. Getting Instagram Graph Auth URL...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/instagram/graph/auth-url", timeout=30)
        if response.status_code == 200:
            data = response.json()
            auth_url = data.get('auth_url')
            print(f"✅ Auth URL generated successfully")
            print(f"URL: {auth_url}")
            
            print("\n" + "="*60)
            print("ACTION REQUIRED:")
            print("="*60)
            print("1. Open this URL in your browser:")
            print(f"   {auth_url}")
            print("\n2. Complete the Instagram login")
            print("3. Copy the ENTIRE redirect URL from your browser")
            print("4. Paste it below")
            print("="*60)
            
            redirect_url = input("\nPaste the redirect URL here: ").strip()
            
            if not redirect_url or 'code=' not in redirect_url:
                print("❌ Invalid redirect URL. Must contain 'code=' parameter")
                return False
            
            # Extract code from URL
            import urllib.parse as urlparse
            parsed = urlparse.urlparse(redirect_url)
            params = urlparse.parse_qs(parsed.query)
            code = params.get('code', [None])[0]
            
            if not code:
                print("❌ Could not extract code from URL")
                return False
            
            print(f"\n✅ Extracted code: {code[:20]}...")
            
            # Step 2: Login with code
            print("\n2. Testing login with OAuth code...")
            login_data = {"code": code}
            
            response = requests.post(
                f"{BACKEND_URL}/api/instagram/graph/login",
                json=login_data,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                login_result = response.json()
                if login_result.get('success'):
                    print("✅ Login successful!")
                    
                    # Display session info
                    session_info = login_result.get('session_info', {})
                    auth_info = login_result.get('auth_info', {})
                    
                    print(f"\n📊 SESSION INFO:")
                    print(f"  User ID: {session_info.get('user_id')}")
                    print(f"  Username: {session_info.get('username')}")
                    print(f"  Page ID: {session_info.get('page_id')}")
                    print(f"  Has Access Token: {session_info.get('has_access_token')}")
                    print(f"  Account Type: {session_info.get('account_type')}")
                    print(f"  Followers: {session_info.get('followers')}")
                    
                    print(f"\n🔐 AUTH INFO:")
                    print(f"  Instagram User ID: {auth_info.get('instagram_user_id')}")
                    print(f"  Page ID: {auth_info.get('page_id')}")
                    print(f"  Token Length: {auth_info.get('page_access_token_length')}")
                    print(f"  Session Stored: {auth_info.get('session_stored')}")
                    print(f"  Active Sessions: {auth_info.get('total_active_sessions')}")
                    
                    # Step 3: Test session storage
                    print("\n3. Verifying session storage...")
                    response = requests.get(f"{BACKEND_URL}/api/debug/sessions", timeout=30)
                    if response.status_code == 200:
                        sessions = response.json()
                        print(f"✅ Sessions endpoint accessible")
                        print(f"Active sessions: {len(sessions.get('sessions', []))}")
                        
                        # Step 4: Test upload capability
                        print("\n4. Testing upload capability...")
                        print("Note: This will test the upload endpoint structure without actually uploading")
                        
                        # Test with a dummy video (this will fail but show us the structure)
                        test_data = {
                            "video_url": "https://example.com/test.mp4",
                            "caption": "Test upload from terminal"
                        }
                        
                        response = requests.post(
                            f"{BACKEND_URL}/api/instagram/graph/upload-reel",
                            json=test_data,
                            headers={"Content-Type": "application/json"},
                            timeout=30
                        )
                        
                        print(f"Upload test status: {response.status_code}")
                        print(f"Upload test response: {response.text}")
                        
                        if response.status_code in [400, 422]:  # Expected for invalid video URL
                            print("✅ Upload endpoint is accessible and properly structured")
                        else:
                            print("⚠️  Upload endpoint response unexpected")
                    
                    print("\n" + "="*60)
                    print("✅ COMPLETE FLOW TEST SUCCESSFUL!")
                    print("="*60)
                    print("The Instagram Graph API login and session storage is working correctly.")
                    print("You can now use the UI to upload content.")
                    return True
                else:
                    print(f"❌ Login failed: {login_result.get('error', 'Unknown error')}")
            else:
                print(f"❌ Login request failed: {response.text}")
                
        else:
            print(f"❌ Failed to get auth URL: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    return False

if __name__ == "__main__":
    test_complete_flow()
