#!/usr/bin/env python3
"""
Test backend directly with fresh OAuth code
"""

import requests
import json
import webbrowser
import time
import urllib.parse as urlparse

BACKEND_URL = "https://backrooms-e8nm.onrender.com"

print("="*60)
print("DIRECT BACKEND TEST")
print("="*60)

# Get fresh auth URL
print("1. Getting fresh auth URL...")
response = requests.get(f"{BACKEND_URL}/api/instagram/graph/auth-url", timeout=30)

if response.status_code == 200:
    data = response.json()
    auth_url = data.get('data', {}).get('auth_url')
    print(f"✅ Auth URL: {auth_url}")
    
    print("\n2. IMPORTANT: Use this URL in a PRIVATE/INCOGNITO browser window")
    print("   This ensures no existing sessions interfere")
    print(f"\n🔗 URL: {auth_url}")
    
    print("\n3. After login, copy the redirect URL and run:")
    print("   python3 test_fresh_code.py 'YOUR_REDIRECT_URL'")
    
else:
    print(f"❌ Failed to get auth URL: {response.text}")
