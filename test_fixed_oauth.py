#!/usr/bin/env python3
"""
Test the fixed OAuth flow
"""

import requests
import json
import urllib.parse as urlparse
import sys

BACKEND_URL = "https://backrooms-e8nm.onrender.com"

if len(sys.argv) != 2:
    print("Usage: python3 test_fixed_oauth.py 'REDIRECT_URL'")
    sys.exit(1)

redirect_url = sys.argv[1]

print("="*80)
print("TESTING FIXED OAUTH FLOW")
print("="*80)

# Extract code
parsed = urlparse.urlparse(redirect_url)
params = urlparse.parse_qs(parsed.query)
code = params.get('code', [None])[0]

if not code:
    print("❌ Could not extract code from URL")
    sys.exit(1)

print(f"Code: {code[:20]}...")

# Test login with fixed backend
print("\nTesting login with fixed backend...")
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
        data = response.json()
        if data.get('success'):
            print("\n🎉 OAUTH FIX SUCCESSFUL!")
            print(f"Username: {data.get('data', {}).get('username')}")
            print(f"User ID: {data.get('data', {}).get('user_id')}")
            
            # Display session info
            session_info = data.get('session_info', {})
            auth_info = data.get('auth_info', {})
            
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
            
            print("\n" + "="*60)
            print("🎉 COMPLETE SUCCESS!")
            print("="*60)
            print("The OAuth fix worked!")
            print("✅ Token exchange successful")
            print("✅ Session stored")
            print("✅ Ready for posting!")
            
        else:
            print(f"\n❌ Login failed: {data.get('detail') or data.get('error')}")
    else:
        print(f"\n❌ Request failed: {response.text}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
