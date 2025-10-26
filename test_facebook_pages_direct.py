#!/usr/bin/env python3
"""
Test Facebook Pages API directly to understand the issue
"""

import requests
import json

def test_facebook_pages_direct():
    """Test Facebook Pages API directly"""
    
    print("🔍 TESTING FACEBOOK PAGES API DIRECTLY")
    print("=" * 50)
    
    print("\n1. 📋 FACEBOOK PAGES API REQUIREMENTS:")
    print("   - User must have Facebook Pages")
    print("   - Pages must have instagram_business_account field")
    print("   - User must be admin of the pages")
    print("   - Instagram account must be Business/Creator type")
    
    print("\n2. 🔗 API ENDPOINT:")
    print("   GET https://graph.facebook.com/v21.0/me/accounts")
    print("   ?access_token=USER_ACCESS_TOKEN")
    print("   &fields=id,name,access_token,instagram_business_account")
    
    print("\n3. 🎯 TESTING APPROACH:")
    print("   a) Complete OAuth flow to get access token")
    print("   b) Use access token to call /me/accounts")
    print("   c) Check if pages have instagram_business_account")
    print("   d) Identify the specific issue")
    
    print("\n4. 🚨 LIKELY ISSUES:")
    print("   - No Facebook Pages (user needs to create one)")
    print("   - Instagram not connected to any Page")
    print("   - Instagram account is Personal (not Business/Creator)")
    print("   - User doesn't have admin access to the Page")
    
    print("\n5. 🔧 QUICK FIXES:")
    print("   - Create a Facebook Page: https://www.facebook.com/pages/create")
    print("   - Convert Instagram to Business: Instagram Settings > Account > Switch to Professional Account")
    print("   - Connect Instagram to Page: Facebook Page Settings > Instagram")
    print("   - Ensure you're Page admin")
    
    print("\n6. 🧪 MANUAL TEST:")
    print("   Complete the OAuth flow and check:")
    print("   - Do you see a Facebook Pages selection screen?")
    print("   - Are there any pages listed?")
    print("   - Do you get permission dialogs?")
    print("   - What error appears in the browser console?")

if __name__ == "__main__":
    test_facebook_pages_direct()
