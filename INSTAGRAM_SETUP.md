# Instagram Connection Setup Guide

## 🎉 What's Been Implemented

Your app now supports **TWO** ways for users to connect their Instagram accounts:

### 1. **Meta OAuth** (Recommended for Business/Creator Accounts)
- Official Meta Instagram Graph API
- OAuth 2.0 flow (similar to "Sign in with Google")
- Safer - no password sharing
- Works with Instagram Business and Creator accounts
- Requires Facebook Page connection

### 2. **Direct Login** (For Personal Accounts)
- Username/password login via `instagrapi`
- Works with personal Instagram accounts
- Supports 2FA (two-factor authentication)
- No special setup required

---

## 🚀 Quick Start

Your users can now:

1. **Open your app**
2. **Choose connection method**:
   - Click **"Connect with Meta (Business)"** for business accounts
   - Click **"Direct Login (Personal)"** for personal accounts
3. **Complete authentication**
4. **Start posting Reels!**

---

## ⚙️ Setup Required (For Meta OAuth)

To enable the **Meta OAuth** option, you need to configure a Meta App:

### Step 1: Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Choose **"Business"** type
4. Fill in app details:
   - App Name: `Cast - Social Media Publisher` (or your app name)
   - Contact Email: Your email
   - Business Account: Select or create one

### Step 2: Add Instagram Product

1. In your Meta App dashboard, click **"Add Product"**
2. Find **"Instagram"** and click **"Set Up"**
3. Choose **"Instagram Graph API"**

### Step 3: Configure OAuth Redirect URI

1. Go to **Settings** → **Basic**
2. Scroll to **"Add Platform"** → Choose **"Website"**
3. Add these URLs:

**For Production:**
```
https://backrooms-e8nm.onrender.com/auth/instagram/callback
```

**For Local Development:**
```
http://localhost:8000/auth/instagram/callback
```

4. Click **Save Changes**

### Step 4: Get Your Credentials

1. In **Settings** → **Basic**, copy:
   - **App ID** → This is your `META_APP_ID`
   - **App Secret** → This is your `META_APP_SECRET` (click "Show")

### Step 5: Request Permissions (App Review)

Your app needs these permissions from Meta:

1. Go to **App Review** → **Permissions and Features**
2. Request these permissions:
   - ✅ `instagram_basic` - View basic Instagram account info
   - ✅ `instagram_content_publish` - Publish content to Instagram
   - ✅ `pages_show_list` - List Pages user manages
   - ✅ `pages_read_engagement` - Read Page engagement data
   - ✅ `business_management` - Manage business settings

**Note:** Some permissions require App Review (can take a few days to weeks)

### Step 6: Set Environment Variables

#### On Render (Production):

1. Go to your Render dashboard
2. Select your **backend** service (`backrooms`)
3. Click **Environment** tab
4. Add these variables:

```
META_APP_ID=your_app_id_here
META_APP_SECRET=your_app_secret_here
```

#### Locally (Development):

Add to `backend/.env`:

```env
META_APP_ID=your_app_id_here
META_APP_SECRET=your_app_secret_here
```

---

## 📋 User Requirements (Meta OAuth)

Users who want to connect via **Meta OAuth** must have:

1. ✅ **Instagram Business Account** or **Creator Account**
2. ✅ **Facebook Page** connected to their Instagram account
3. ✅ Admin access to the Facebook Page

### How Users Can Convert to Business Account:

1. Open Instagram app
2. Go to **Settings** → **Account** → **Switch to Professional Account**
3. Choose **Business** or **Creator**
4. Connect to a Facebook Page

---

## 🔧 Testing Meta OAuth Flow

### Before App Review Approval:

While your app is in **Development Mode**, only these users can test:

- App admins
- App developers
- App testers (add in **Roles** → **Roles**)

### Testing Steps:

1. Add test users in Meta App Dashboard → **Roles** → **Roles**
2. Test users must have:
   - Instagram Business/Creator account
   - Connected Facebook Page
   - Admin access to that Page
3. Have them click **"Connect with Meta (Business)"** in your app
4. They'll be redirected to Facebook OAuth
5. After authorization, they'll be redirected back to your app

---

## 💡 How It Works

### Meta OAuth Flow:

```
1. User clicks "Connect with Meta (Business)"
   ↓
2. Backend generates Meta OAuth URL
   ↓
3. User redirected to Facebook login
   ↓
4. User authorizes app permissions
   ↓
5. Meta redirects to backend callback: /auth/instagram/callback?code=xyz
   ↓
6. Backend redirects to frontend: /auth/instagram/callback?code=xyz
   ↓
7. Frontend exchanges code for access token via backend
   ↓
8. Backend retrieves Instagram Business Account info
   ↓
9. User connected! Session stored
```

### Direct Login Flow (instagrapi):

```
1. User clicks "Direct Login (Personal)"
   ↓
2. User enters username and password
   ↓
3. Backend authenticates via instagrapi
   ↓
4. If 2FA required, user enters code
   ↓
5. User connected! Session stored
```

---

## 🎨 UI Features

The updated `InstagramConnection` component now shows:

### When Disconnected:
- **Primary button**: "Connect with Meta (Business)" (blue gradient with Facebook icon)
- **Divider**: "OR"
- **Secondary button**: "Direct Login (Personal)" (purple/pink gradient)
- **Info box**: Explains the difference between both methods

### When Connected:
- Green success banner with "Connected to Instagram"
- **Business badge** if connected via Meta
- Username display
- Follower count and post count
- Account type label
- Disconnect button

---

## 🚨 Important Notes

### Meta API Limitations:

❌ **Reel Uploads Not Yet Implemented**
- Meta API requires videos to be publicly accessible via URL
- You need cloud storage (AWS S3, Cloudflare R2, etc.)
- See `INSTAGRAM_META_STATUS.md` for implementation details

✅ **What's Working:**
- OAuth authentication flow
- User account connection
- Session management
- Account info display

### Direct Login (instagrapi):

✅ **Fully Working:**
- Username/password authentication
- 2FA support
- Reel uploads
- Works with personal accounts

⚠️ **Risks:**
- Unofficial API (could break with Instagram updates)
- Potential for account bans/blocks
- Rate limiting

---

## 📊 Current Status

| Feature | Meta OAuth | Direct Login |
|---------|-----------|--------------|
| **Authentication** | ✅ Working | ✅ Working |
| **Account Info** | ✅ Working | ✅ Working |
| **Reel Upload** | ❌ Not implemented | ✅ Working |
| **Personal Accounts** | ❌ Not supported | ✅ Supported |
| **Business Accounts** | ✅ Supported | ✅ Supported |
| **2FA Support** | N/A (OAuth) | ✅ Supported |
| **Account Ban Risk** | ✅ None | ⚠️ Possible |

---

## 🔜 Next Steps

To fully enable Instagram posting for business accounts via Meta API:

1. ✅ **Set up Meta App** (follow steps above)
2. ✅ **Configure environment variables**
3. ✅ **Test OAuth flow** with test users
4. ⏳ **Submit for App Review** (Meta approval needed)
5. ⏳ **Implement cloud storage** (for video hosting)
6. ⏳ **Add Meta API upload endpoint** (see `INSTAGRAM_META_STATUS.md`)

---

## 🆘 Troubleshooting

### "No Facebook Pages found" Error:
- User needs to create a Facebook Page
- User must be admin of the Page
- Instagram account must be connected to the Page

### "No Instagram Business Account found" Error:
- User needs to convert to Business/Creator account
- Instagram must be connected to their Facebook Page

### OAuth Redirect Not Working:
- Check `BASE_URL` environment variable is set correctly
- Verify redirect URI in Meta App matches exactly
- Ensure both HTTP and HTTPS are configured correctly

### Direct Login Not Working:
- Check backend is running
- Verify `BACKEND_URL` environment variable
- Check backend logs for errors
- Try again (Instagram may be rate limiting)

---

## 📚 Resources

- [Meta Instagram Graph API Docs](https://developers.facebook.com/docs/instagram-api)
- [Instagram Content Publishing API](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [Converting to Business Account](https://help.instagram.com/502981923235522)
- [Connecting Instagram to Facebook Page](https://www.facebook.com/business/help/898752960195806)

---

## ✅ What You Can Do Right Now

Even without Meta App approval, users can:

1. ✅ **Connect personal accounts** via Direct Login
2. ✅ **Upload Reels** to personal accounts
3. ✅ **Test Meta OAuth** (if you add them as test users)

Once you set up the Meta App and get approval:

4. ✅ **Production Meta OAuth** for all business accounts
5. ⏳ **Meta API Reel uploads** (after implementing cloud storage)

---

**You're all set!** 🎉

Users can now connect their Instagram accounts and start posting Reels using the Direct Login method right away!

