#!/usr/bin/env python3
"""
Test backend immediately with fresh code
"""

import requests
import json
import urllib.parse as urlparse
import sys

BACKEND_URL = "https://backrooms-e8nm.onrender.com"

if len(sys.argv) != 2:
    print("Usage: python3 test_immediate.py 'REDIRECT_URL'")
    sys.exit(1)

redirect_url = sys.argv[1]

print("="*60)
print("IMMEDIATE BACKEND TEST")
print("="*60)

# Extract code
parsed = urlparse.urlparse(redirect_url)
params = urlparse.parse_qs(parsed.query)
code = params.get('code', [None])[0]

if not code:
    print("❌ Could not extract code from URL")
    sys.exit(1)

print(f"Code: {code[:20]}...")

# Test backend immediately
print("\nTesting backend immediately...")
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
            print("\n✅ BACKEND LOGIN SUCCESSFUL!")
            print(f"Username: {data.get('data', {}).get('username')}")
            print(f"User ID: {data.get('data', {}).get('user_id')}")
            
            # Check sessions
            print("\nChecking sessions...")
            response = requests.get(f"{BACKEND_URL}/api/debug/sessions", timeout=30)
            sessions = response.json()
            print(f"Active sessions: {len(sessions.get('sessions', {}))}")
            
            if sessions.get('sessions'):
                print("✅ Session stored successfully!")
                for user_id, session in sessions['sessions'].items():
                    print(f"  - {session.get('username')} (ID: {user_id})")
            
            print("\n" + "="*50)
            print("✅ BACKEND IS WORKING!")
            print("The issue is in the frontend callback page")
            print("="*50)
        else:
            print(f"\n❌ BACKEND LOGIN FAILED!")
            print(f"Error: {data.get('detail') or data.get('error')}")
    else:
        print(f"\n❌ BACKEND REQUEST FAILED!")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
