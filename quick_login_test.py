#!/usr/bin/env python3
"""
Quick login test with fresh OAuth code
"""

import requests
import json
import webbrowser
import time
import urllib.parse as urlparse

BACKEND_URL = "https://backrooms-e8nm.onrender.com"

print("="*60)
print("QUICK LOGIN TEST")
print("="*60)

# Step 1: Get fresh auth URL
print("1. Getting fresh auth URL...")
response = requests.get(f"{BACKEND_URL}/api/instagram/graph/auth-url", timeout=30)

if response.status_code == 200:
    data = response.json()
    auth_url = data.get('data', {}).get('auth_url')
    print(f"✅ Auth URL: {auth_url}")
    
    print("\n2. Opening browser for login...")
    print("Complete the login and copy the ENTIRE redirect URL")
    print("(The URL should contain ?code=...&state=...)")
    
    # Open browser
    webbrowser.open(auth_url)
    
    print("\n3. Paste the redirect URL here:")
    redirect_url = input("> ").strip()
    
    if redirect_url and 'code=' in redirect_url:
        # Extract code
        parsed = urlparse.urlparse(redirect_url)
        params = urlparse.parse_qs(parsed.query)
        code = params.get('code', [None])[0]
        
        if code:
            print(f"\n4. Testing login with code: {code[:20]}...")
            
            # Test login immediately
            login_data = {"code": code}
            response = requests.post(
                f"{BACKEND_URL}/api/instagram/graph/login",
                json=login_data,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print("\n✅ LOGIN SUCCESSFUL!")
                    print(f"Username: {result.get('data', {}).get('username')}")
                    print(f"User ID: {result.get('data', {}).get('user_id')}")
                    
                    # Check if session was stored
                    print("\n5. Checking stored sessions...")
                    response = requests.get(f"{BACKEND_URL}/api/debug/sessions", timeout=30)
                    sessions = response.json()
                    print(f"Active sessions: {len(sessions.get('sessions', {}))}")
                    
                    if sessions.get('sessions'):
                        print("✅ Session stored successfully!")
                        for user_id, session in sessions['sessions'].items():
                            print(f"  - {session.get('username')} (ID: {user_id})")
                    else:
                        print("❌ No session stored")
                    
                    print("\n" + "="*50)
                    print("✅ COMPLETE FLOW WORKING!")
                    print("="*50)
                else:
                    print(f"❌ Login failed: {result.get('error')}")
            else:
                print(f"❌ Request failed: {response.text}")
        else:
            print("❌ Could not extract code from URL")
    else:
        print("❌ Invalid redirect URL")
else:
    print(f"❌ Failed to get auth URL: {response.text}")
