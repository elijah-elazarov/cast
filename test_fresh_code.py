#!/usr/bin/env python3
"""
Test with completely fresh code
"""

import requests
import json
import urllib.parse as urlparse
import sys

BACKEND_URL = "https://backrooms-e8nm.onrender.com"

if len(sys.argv) != 2:
    print("Usage: python3 test_fresh_code.py 'REDIRECT_URL'")
    sys.exit(1)

redirect_url = sys.argv[1]

print("="*60)
print("FRESH CODE TEST")
print("="*60)

# Extract code
parsed = urlparse.urlparse(redirect_url)
params = urlparse.parse_qs(parsed.query)
code = params.get('code', [None])[0]

if not code:
    print("❌ Could not extract code from URL")
    sys.exit(1)

print(f"Code: {code[:20]}...")

# Test login immediately
print("\nTesting login...")
login_data = {"code": code}

try:
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
            
            # Display full session info
            session_info = result.get('session_info', {})
            auth_info = result.get('auth_info', {})
            
            print(f"\n📊 SESSION INFO:")
            for key, value in session_info.items():
                print(f"  {key}: {value}")
            
            print(f"\n🔐 AUTH INFO:")
            for key, value in auth_info.items():
                print(f"  {key}: {value}")
            
            # Check sessions
            print("\nChecking stored sessions...")
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
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
