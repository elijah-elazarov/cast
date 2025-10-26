#!/usr/bin/env python3
"""
Debug the specific 500 error by testing each step
"""

import requests
import json

def debug_specific_error():
    """Debug the specific 500 error step by step"""
    
    print("🔍 DEBUGGING SPECIFIC 500 ERROR")
    print("=" * 50)
    
    # Get fresh OAuth URL
    print("\n1. Getting fresh OAuth URL...")
    try:
        response = requests.get("https://backrooms-e8nm.onrender.com/api/instagram/graph/auth-url")
        data = response.json()
        
        if data.get('success'):
            auth_url = data['data']['auth_url']
            state = data['data']['state']
            print(f"✅ OAuth URL: {auth_url}")
        else:
            print(f"❌ Failed to get OAuth URL")
            return
    except Exception as e:
        print(f"❌ Error: {e}")
        return
    
    print(f"\n2. 🎯 CRITICAL TEST - Complete OAuth flow with this URL:")
    print(f"   {auth_url}")
    print(f"\n3. 📋 REQUIREMENTS CHECKLIST:")
    print(f"   Before testing, verify you have:")
    print(f"   □ Facebook account")
    print(f"   □ Facebook Page (create one if needed)")
    print(f"   □ Instagram Business/Creator account")
    print(f"   □ Instagram connected to Facebook Page")
    print(f"   □ You're admin of the Facebook Page")
    
    print(f"\n4. 🔍 DEBUGGING STEPS:")
    print(f"   a) Complete OAuth flow")
    print(f"   b) Check browser console for errors")
    print(f"   c) Look for specific error messages")
    print(f"   d) Check if you see Facebook Pages selection")
    print(f"   e) Note any permission requests")
    
    print(f"\n5. 🚨 COMMON ISSUES:")
    print(f"   - No Facebook Pages → Create a Facebook Page")
    print(f"   - Instagram not connected → Connect Instagram to Page")
    print(f"   - Wrong account type → Convert to Business/Creator")
    print(f"   - Permission denied → Grant all requested permissions")
    
    print(f"\n6. 📞 NEXT STEPS:")
    print(f"   After completing OAuth, report:")
    print(f"   - What error message you see")
    print(f"   - What appears in browser console")
    print(f"   - Whether you see Facebook Pages selection")
    print(f"   - Any permission dialogs")

if __name__ == "__main__":
    debug_specific_error()
