# Instagram Basic Display API Setup - 2025

## 🎯 **MUCH SIMPLER APPROACH - No Advanced Access Required!**

The Instagram Basic Display API is **much easier** to set up and doesn't require advanced access or business verification. It works with **personal Instagram accounts**.

## **✅ What You Get:**
- ✅ **Personal Instagram account authentication**
- ✅ **Read user profile and media**
- ✅ **No advanced access required**
- ✅ **No business verification needed**
- ✅ **Works immediately**

## **❌ What You DON'T Get:**
- ❌ **Cannot publish content** (read-only)
- ❌ **Cannot post to Stories/Reels**
- ❌ **Cannot upload videos**

## **🔧 Setup Steps:**

### **Step 1: Create Instagram Basic Display App**

1. **Go to:** [Facebook Developers](https://developers.facebook.com/)
2. **Click:** "My Apps" → "Create App"
3. **Select:** "Consumer" (not Business)
4. **App Name:** "Cast Social Media App"
5. **App Contact Email:** your-email@example.com
6. **App Purpose:** "Other"

### **Step 2: Add Instagram Basic Display Product**

1. **In your app dashboard:**
   - Click "Add Product"
   - Find "Instagram Basic Display"
   - Click "Set Up"

2. **Configure Instagram Basic Display:**
   - **Valid OAuth Redirect URIs:** `https://cast-five.vercel.app/auth/instagram/callback`
   - **Deauthorize Callback URL:** `https://cast-five.vercel.app/auth/instagram/callback`
   - **Data Deletion Request URL:** `https://cast-five.vercel.app/auth/instagram/callback`

### **Step 3: Get App Credentials**

1. **App ID:** Copy from "App ID" field
2. **App Secret:** Click "Show" next to "App Secret" and copy

### **Step 4: Add Instagram Testers**

1. **Go to:** Instagram Basic Display → "Roles"
2. **Add Instagram Testers:**
   - Click "Add Instagram Testers"
   - Enter Instagram usernames to test with
   - Send invitations

### **Step 5: Update Environment Variables**

**Backend (.env):**
```env
# Instagram Basic Display API (2025) - Personal Account API
INSTAGRAM_APP_ID=your_instagram_app_id_here
INSTAGRAM_APP_SECRET=your_instagram_app_secret_here
INSTAGRAM_REDIRECT_URI=https://cast-five.vercel.app/auth/instagram/callback
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_BACKEND_URL=https://backrooms-e8nm.onrender.com
```

### **Step 6: Test the API**

**Test Auth URL:**
```bash
curl -s https://backrooms-e8nm.onrender.com/api/instagram/basic/auth-url
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "auth_url": "https://api.instagram.com/oauth/authorize?client_id=...",
    "state": "random_state_token"
  }
}
```

## **🚀 How to Use:**

### **1. Get Auth URL:**
```bash
GET /api/instagram/basic/auth-url
```

### **2. User Authorizes:**
- User clicks auth URL
- User logs into Instagram
- User grants permissions
- User is redirected to callback

### **3. Exchange Code for Token:**
```bash
POST /api/instagram/basic/login
{
  "code": "authorization_code_from_callback"
}
```

### **4. Get User Info:**
```bash
GET /api/instagram/basic/user-info
```

## **📱 Frontend Integration:**

```typescript
// Get auth URL
const response = await fetch('/api/instagram/basic/auth-url');
const { data } = await response.json();

// Redirect user to Instagram
window.location.href = data.auth_url;

// Handle callback
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

if (code) {
  // Exchange code for token
  const loginResponse = await fetch('/api/instagram/basic/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  
  const result = await loginResponse.json();
  console.log('Instagram connected:', result.data);
}
```

## **🔍 API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/instagram/basic/auth-url` | GET | Get OAuth authorization URL |
| `/api/instagram/basic/login` | POST | Exchange code for access token |
| `/api/instagram/basic/user-info` | GET | Get user profile info |
| `/api/instagram/basic/media` | GET | Get user's media |

## **⚠️ Important Notes:**

1. **Read-Only API:** This API can only read data, not publish content
2. **Personal Accounts:** Works with personal Instagram accounts
3. **No Publishing:** Cannot post to Stories, Reels, or feed
4. **Testers Required:** Must add Instagram testers to test the app
5. **Review Process:** May need app review for production use

## **🔄 Next Steps:**

If you need **publishing capabilities** (posting to Stories/Reels), you'll need to:
1. Switch to Instagram Graph API
2. Get advanced access
3. Use business accounts
4. Go through app review

But for now, this Basic Display API will let you authenticate users and read their data!

## **🎉 Success!**

You now have a working Instagram integration that:
- ✅ Authenticates users
- ✅ Reads user profiles
- ✅ Reads user media
- ✅ No advanced access required
- ✅ Works with personal accounts
