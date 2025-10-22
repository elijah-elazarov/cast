# Testing Checklist

## ✅ Pre-Flight Check

- [x] Backend running on port 8000
- [x] Frontend running on port 3000  
- [x] Ngrok tunnel active: `https://your-ngrok-url.ngrok-free.app`
- [x] YouTube credentials configured in `backend/.env`

## 🧪 Testing Steps

### 1. Instagram Connection Test
**Goal:** Verify Instagram login flow with 2FA support

- [ ] Open: `https://your-ngrok-url.ngrok-free.app`
- [ ] Click "Connect Instagram"
- [ ] Enter username and password
- [ ] If 2FA required, enter verification code
- [ ] Verify "Connected to Instagram" message appears
- [ ] Check that "Upload Video Content" section appears

**Expected:** 
- ✅ No red 401 errors in console (should see 202 for 2FA)
- ✅ Smooth fade-in animation when upload section appears
- ✅ Connected state persists after page refresh

### 2. YouTube Connection Test
**Goal:** Verify YouTube OAuth flow

- [ ] Click "Connect YouTube"
- [ ] Verify redirect to Google OAuth page
- [ ] Authorize the app
- [ ] Verify redirect back to app
- [ ] Check "Connected to YouTube" message appears
- [ ] Verify channel info displays (subscriber count, etc.)

**Expected:**
- ✅ OAuth flow completes successfully
- ✅ User returned to correct callback URL
- ✅ Channel info fetched and displayed

### 3. Single Platform Upload Test (Instagram)
**Goal:** Upload video to Instagram only

- [ ] Select a video file (MP4/MOV, <100MB, <90 seconds)
- [ ] Add a caption
- [ ] Click "Upload to Instagram"
- [ ] Watch progress bar reach 100%
- [ ] Verify success message

**Expected:**
- ✅ File uploads successfully
- ✅ Progress bar animates smoothly
- ✅ Success message appears
- ✅ Video uploaded to Instagram Reels

### 4. Single Platform Upload Test (YouTube)
**Goal:** Upload video to YouTube only

- [ ] Disconnect Instagram (or use fresh session)
- [ ] Connect only YouTube
- [ ] Select a video file
- [ ] Add caption (will be used as YouTube title)
- [ ] Click "Upload to YouTube"
- [ ] Verify success with YouTube link

**Expected:**
- ✅ Video uploads as YouTube Short
- ✅ Title includes #Shorts automatically
- ✅ Success message shows YouTube URL

### 5. Multi-Platform Upload Test
**Goal:** Upload to both Instagram and YouTube simultaneously

- [ ] Connect both Instagram and YouTube
- [ ] Select a video file
- [ ] Add caption
- [ ] Click "Upload to All Platforms"
- [ ] Verify both uploads succeed

**Expected:**
- ✅ Both platforms upload simultaneously
- ✅ Success message mentions both platforms
- ✅ Video appears on both Instagram and YouTube

### 6. Disconnect Test
**Goal:** Verify logout functionality

- [ ] Click disconnect on Instagram
- [ ] Verify local storage cleared
- [ ] Verify upload section hides smoothly
- [ ] Repeat for YouTube

**Expected:**
- ✅ Logout successful
- ✅ State cleared
- ✅ UI updates correctly

## 🐛 Known Issues to Watch For

### Console Errors
- ❌ Look for: Red 401 errors (should be 202 for 2FA)
- ❌ Look for: CORS errors
- ❌ Look for: Network errors

### User Experience
- ❌ Page flashing/flickering on login (should be smooth fade)
- ❌ Upload section appearing/disappearing abruptly
- ❌ Buttons not responding

### Functionality
- ❌ Videos failing to upload
- ❌ OAuth flow breaking
- ❌ Session not persisting

## 📝 Notes

**Current Ngrok URL:** `https://your-ngrok-url.ngrok-free.app`

**If Ngrok URL changes:**
1. Update `backend/.env` BASE_URL
2. Update Google Cloud Console OAuth settings
3. Restart backend

**Files to check:**
- `backend/.env` - Configuration
- Browser console - Error messages
- Backend logs - Python errors

## 🎯 Success Criteria

✅ Instagram connects with 2FA support  
✅ YouTube connects via OAuth  
✅ Videos upload to both platforms  
✅ Multi-platform upload works  
✅ UI/UX is smooth (no flicker)  
✅ No console errors  
✅ Disconnect works  

