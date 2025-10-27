#!/usr/bin/env python3
"""
Complete Instagram Graph API Flow Test - Fixed Version
"""

import requests
import json
import urllib.parse as urlparse

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
            auth_url = data.get('data', {}).get('auth_url')
            print(f"✅ Auth URL generated successfully")
            print(f"URL: {auth_url}")
            
            print("\n" + "="*60)
            print("MANUAL TEST INSTRUCTIONS:")
            print("="*60)
            print("1. Open this URL in your browser:")
            print(f"   {auth_url}")
            print("\n2. Complete the Instagram login")
            print("3. You'll be redirected to the callback page")
            print("4. Check the browser console for session_info and auth_info")
            print("5. If you see the session data, the flow is working!")
            print("="*60)
            
            # Step 2: Test session endpoint
            print("\n2. Testing session endpoint...")
            response = requests.get(f"{BACKEND_URL}/api/debug/sessions", timeout=30)
            if response.status_code == 200:
                sessions = response.json()
                print(f"✅ Sessions endpoint accessible")
                print(f"Current active sessions: {len(sessions.get('sessions', []))}")
                
                if sessions.get('sessions'):
                    print("Active sessions:")
                    for session in sessions['sessions']:
                        print(f"  - User: {session.get('username', 'Unknown')} (ID: {session.get('user_id', 'Unknown')})")
            else:
                print(f"❌ Sessions endpoint failed: {response.text}")
            
            # Step 3: Test upload endpoint structure
            print("\n3. Testing upload endpoint structure...")
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
            if response.status_code in [400, 422, 401]:  # Expected responses
                print("✅ Upload endpoint is accessible and properly structured")
                print(f"Response: {response.text[:200]}...")
            else:
                print(f"⚠️  Upload endpoint response: {response.text}")
            
            print("\n" + "="*60)
            print("TEST COMPLETE!")
            print("="*60)
            print("Now try logging in through the UI:")
            print("1. Go to your app: https://cast-five.vercel.app")
            print("2. Click Instagram login")
            print("3. Complete the OAuth flow")
            print("4. Check the callback page for session_info and auth_info")
            print("5. If you see the data, everything is working!")
            return True
                
        else:
            print(f"❌ Failed to get auth URL: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    return False

if __name__ == "__main__":
    test_complete_flow()
