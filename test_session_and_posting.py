#!/usr/bin/env python3
"""
Test complete Instagram Graph API flow: login, session, and posting capability
"""

import requests
import json
import time

BACKEND_URL = "https://backrooms-e8nm.onrender.com"

def test_complete_flow():
    """Test login, session storage, and posting capability"""
    print("="*60)
    print("Testing Complete Instagram Graph API Flow")
    print("="*60)
    
    # Step 1: Test login endpoint
    print("\n1. Testing login endpoint...")
    try:
        login_response = requests.post(
            f"{BACKEND_URL}/api/instagram/graph/login",
            json={
                "code": "test_code_placeholder"  # This would normally come from OAuth callback
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Login response status: {login_response.status_code}")
        print(f"Login response: {login_response.text}")
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            print("✅ Login successful!")
            print(f"User ID: {login_data.get('data', {}).get('user_id')}")
            print(f"Username: {login_data.get('data', {}).get('username')}")
            
            # Step 2: Check session storage
            print("\n2. Testing session storage...")
            session_response = requests.get(f"{BACKEND_URL}/api/debug/sessions")
            
            if session_response.status_code == 200:
                sessions = session_response.json()
                print(f"✅ Sessions endpoint accessible")
                print(f"Active sessions: {sessions}")
            else:
                print(f"❌ Session check failed: {session_response.text}")
            
            # Step 3: Test posting capability
            print("\n3. Testing posting capability...")
            
            # Test reel upload endpoint
            test_file = {
                "filename": "test_reel.mp4",
                "content": b"fake_video_content",  # In real test, this would be actual video bytes
                "content_type": "video/mp4"
            }
            
            upload_response = requests.post(
                f"{BACKEND_URL}/api/instagram/graph/upload-reel",
                files={"file": ("test_reel.mp4", test_file["content"], test_file["content_type"])},
                data={"caption": "Test reel from API"},
                timeout=60
            )
            
            print(f"Upload response status: {upload_response.status_code}")
            print(f"Upload response: {upload_response.text}")
            
            if upload_response.status_code == 200:
                print("✅ Posting capability confirmed!")
            else:
                print("❌ Posting test failed (expected without proper auth)")
                
        else:
            print(f"❌ Login failed: {login_response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

def test_session_endpoints():
    """Test session-related endpoints"""
    print("\n" + "="*40)
    print("Session Endpoints Test")
    print("="*40)
    
    try:
        # Test sessions endpoint
        response = requests.get(f"{BACKEND_URL}/api/debug/sessions")
        
        print(f"Sessions endpoint: {response.status_code}")
        if response.status_code == 200:
            print("✅ Sessions accessible")
            sessions = response.json()
            print(f"Active sessions: {len(sessions)}")
            
            # Test session details
            details_response = requests.get(f"{BACKEND_URL}/api/debug/sessions/full")
            if details_response.status_code == 200:
                print("✅ Session details accessible")
                details = details_response.json()
                for user_id, session in details.items():
                    print(f"User {user_id}: {session.get('username')} - {session.get('account_type')}")
            else:
                print(f"❌ Session details failed: {details_response.text}")
        else:
            print(f"❌ Sessions failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_posting():
    """Test posting endpoints"""
    print("\n" + "="*40)
    print("Posting Test")
    print("="*40)
    
    try:
        # Test story upload
        story_response = requests.post(
            f"{BACKEND_URL}/api/instagram/graph/upload-story",
            files={"file": ("test_story.mp4", b"fake_content", "video/mp4")},
            data={"caption": "Test story"},
            timeout=60
        )
        
        print(f"Story upload: {story_response.status_code}")
        if story_response.status_code == 200:
            print("✅ Story upload works!")
        else:
            print(f"❌ Story failed: {story_response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_instagram_account_info():
    """Test Instagram account info endpoint"""
    print("\n" + "="*40)
    print("Instagram Account Info Test")
    print("="*40)
    
    try:
        # Test account info endpoint
        account_response = requests.get(f"{BACKEND_URL}/api/instagram/account-info")
        
        print(f"Account info: {account_response.status_code}")
        if account_response.status_code == 200:
            account_data = account_response.json()
            print("✅ Account info accessible")
            print(f"Account data: {account_data}")
        else:
            print(f"❌ Account info failed: {account_response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_complete_flow()
    test_session_endpoints()
    test_posting()
    test_instagram_account_info()
