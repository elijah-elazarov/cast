#!/usr/bin/env python3
"""
Check where sessions are stored and how to view them
"""

import requests
import json

BACKEND_URL = "https://backrooms-e8nm.onrender.com"

print("="*80)
print("SESSION STORAGE LOCATIONS")
print("="*80)

print("\n📍 WHERE SESSIONS ARE STORED:")
print("="*50)

print("1. IN-MEMORY STORAGE (Current Implementation)")
print("   - Sessions stored in Python dictionaries on backend")
print("   - Location: backend/main.py - instagram_graph_sessions dict")
print("   - Persistence: Lost when server restarts")
print("   - Access: Via debug endpoints")

print("\n2. DEBUG ENDPOINTS TO CHECK SESSIONS:")
print("="*50)

print("🔍 Basic Session Info:")
print(f"   GET {BACKEND_URL}/api/debug/sessions")
print("   - Shows active session count")
print("   - Shows usernames and user IDs")
print("   - No sensitive data")

print("\n🔍 Full Session Data (with tokens):")
print(f"   GET {BACKEND_URL}/api/debug/sessions/full")
print("   - Shows complete session data")
print("   - Includes access tokens")
print("   - More detailed information")

print("\n🔍 Login History:")
print(f"   GET {BACKEND_URL}/api/debug/login-history")
print("   - Shows recent login attempts")
print("   - Tracks session creation")
print("   - Debug information")

print("\n" + "="*60)
print("HOW TO CHECK SESSIONS:")
print("="*60)

print("METHOD 1: Using curl commands")
print("curl -s 'https://backrooms-e8nm.onrender.com/api/debug/sessions' | python3 -m json.tool")

print("\nMETHOD 2: Using Python script")
print("python3 check_sessions.py")

print("\nMETHOD 3: Browser (for basic info)")
print("Visit: https://backrooms-e8nm.onrender.com/api/debug/sessions")

print("\n" + "="*60)
print("CURRENT SESSION STATUS:")
print("="*60)

try:
    print("Checking current sessions...")
    response = requests.get(f"{BACKEND_URL}/api/debug/sessions", timeout=30)
    
    if response.status_code == 200:
        sessions = response.json()
        print(f"✅ Sessions endpoint accessible")
        print(f"Active sessions: {len(sessions.get('sessions', {}))}")
        
        if sessions.get('sessions'):
            print("\n📊 ACTIVE SESSIONS:")
            for user_id, session in sessions['sessions'].items():
                print(f"  👤 User: {session.get('username', 'Unknown')}")
                print(f"     ID: {user_id}")
                print(f"     Page ID: {session.get('page_id', 'Unknown')}")
                print(f"     Account Type: {session.get('account_type', 'Unknown')}")
                print(f"     Followers: {session.get('followers_count', 0)}")
                print(f"     Media: {session.get('media_count', 0)}")
                print()
        else:
            print("❌ No active sessions found")
            print("   This means no successful logins have occurred yet")
    else:
        print(f"❌ Sessions endpoint failed: {response.text}")
        
except Exception as e:
    print(f"❌ Error checking sessions: {e}")

print("\n" + "="*60)
print("SESSION STORAGE DETAILS:")
print("="*60)

print("📁 Backend Code Location:")
print("   File: backend/main.py")
print("   Variable: instagram_graph_sessions = {}")
print("   Type: Python dictionary")
print("   Key: Instagram user ID")
print("   Value: Session data dict")

print("\n📊 Session Data Structure:")
print("   {")
print("     'user_id': 'instagram_user_id',")
print("     'username': 'instagram_username',")
print("     'page_id': 'facebook_page_id',")
print("     'page_access_token': 'long_lived_token',")
print("     'account_type': 'BUSINESS',")
print("     'followers_count': 836,")
print("     'media_count': 3")
print("   }")

print("\n⚠️  IMPORTANT NOTES:")
print("   - Sessions are stored in memory only")
print("   - Lost when server restarts")
print("   - No file-based persistence")
print("   - Perfect for testing, but not production")

print("\n" + "="*60)
print("AFTER SUCCESSFUL LOGIN:")
print("="*60)

print("1. Check sessions: python3 check_sessions.py")
print("2. Verify session data is stored")
print("3. Test posting functionality")
print("4. Confirm everything works end-to-end")
