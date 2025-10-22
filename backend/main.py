from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from instagrapi import Client
from instagrapi.exceptions import LoginRequired, BadPassword
import os
import json
import pickle
from typing import Optional
import logging
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Social Media API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active sessions (in production, use Redis or database)
active_sessions = {}
youtube_sessions = {}  # Store YouTube credentials
tiktok_sessions = {}  # Store TikTok credentials

# Session persistence
SESSIONS_DIR = "sessions"
INSTAGRAM_SESSIONS_FILE = os.path.join(SESSIONS_DIR, "instagram_sessions.json")

def ensure_sessions_dir():
    """Create sessions directory if it doesn't exist"""
    if not os.path.exists(SESSIONS_DIR):
        os.makedirs(SESSIONS_DIR)

def save_instagram_session(username: str, session_data: dict):
    """Save Instagram session data to file"""
    try:
        ensure_sessions_dir()
        
        # Load existing sessions
        sessions = {}
        if os.path.exists(INSTAGRAM_SESSIONS_FILE):
            with open(INSTAGRAM_SESSIONS_FILE, 'r') as f:
                sessions = json.load(f)
        
        # Update with new session
        sessions[username] = session_data
        
        # Save back to file
        with open(INSTAGRAM_SESSIONS_FILE, 'w') as f:
            json.dump(sessions, f, indent=2)
            
        logger.info(f"Saved Instagram session for {username}")
    except Exception as e:
        logger.error(f"Failed to save Instagram session: {e}")

def load_instagram_sessions():
    """Load Instagram sessions from file"""
    try:
        if not os.path.exists(INSTAGRAM_SESSIONS_FILE):
            return {}
            
        with open(INSTAGRAM_SESSIONS_FILE, 'r') as f:
            sessions = json.load(f)
            
        logger.info(f"Loaded {len(sessions)} Instagram sessions from file")
        return sessions
    except Exception as e:
        logger.error(f"Failed to load Instagram sessions: {e}")
        return {}

def remove_instagram_session(username: str):
    """Remove Instagram session from file"""
    try:
        if not os.path.exists(INSTAGRAM_SESSIONS_FILE):
            return
            
        sessions = {}
        with open(INSTAGRAM_SESSIONS_FILE, 'r') as f:
            sessions = json.load(f)
            
        if username in sessions:
            del sessions[username]
            
            with open(INSTAGRAM_SESSIONS_FILE, 'w') as f:
                json.dump(sessions, f, indent=2)
                
        logger.info(f"Removed Instagram session for {username}")
    except Exception as e:
        logger.error(f"Failed to remove Instagram session: {e}")

# YouTube OAuth configuration
YOUTUBE_CLIENT_ID = os.getenv('YOUTUBE_CLIENT_ID', '')
YOUTUBE_CLIENT_SECRET = os.getenv('YOUTUBE_CLIENT_SECRET', '')
# BASE_URL must be a publicly accessible URL (Ngrok, production domain, etc.)
# Google OAuth cannot redirect to localhost!
BASE_URL = os.getenv('BASE_URL', '')
if not BASE_URL:
    raise ValueError("BASE_URL environment variable is required. Use Ngrok or a public domain.")
YOUTUBE_REDIRECT_URI = f'{BASE_URL}/auth/youtube/callback'
# Request both upload and read permissions
YOUTUBE_SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly'
]

# TikTok OAuth configuration
TIKTOK_CLIENT_KEY = os.getenv('TIKTOK_CLIENT_KEY', '')
TIKTOK_CLIENT_SECRET = os.getenv('TIKTOK_CLIENT_SECRET', '')
TIKTOK_REDIRECT_URI = f'{BASE_URL}/auth/tiktok/callback' if BASE_URL else None
# TikTok Content Posting API scopes
TIKTOK_SCOPES = [
    'user.info.basic',
    'video.upload',
    'video.publish',
]


class LoginRequest(BaseModel):
    username: str
    password: str
    verification_code: Optional[str] = None


class UploadRequest(BaseModel):
    caption: Optional[str] = ""
    share_to_feed: bool = True


class LogoutRequest(BaseModel):
    username: str


class YouTubeAuthRequest(BaseModel):
    code: Optional[str] = None


class YouTubeLogoutRequest(BaseModel):
    user_id: str


class TikTokLogoutRequest(BaseModel):
    user_id: str


@app.post("/api/instagram/login")
async def login(request: LoginRequest):
    """
    Login to Instagram using instagrapi
    """
    try:
        cl = Client()
        
        # Attempt login
        if request.verification_code:
            # 2FA login
            cl.login(request.username, request.password, verification_code=request.verification_code)
        else:
            # Regular login
            cl.login(request.username, request.password)
        
        # Get account info
        account_info = cl.account_info()
        
        # Store session data
        # Handle both dict and object responses
        if isinstance(account_info, dict):
            user_id = account_info.get('pk', account_info.get('user_id'))
            username = account_info.get('username', request.username)
            account_type = account_info.get('account_type', 'PERSONAL')
        else:
            # If it's an object, access attributes directly
            user_id = getattr(account_info, 'pk', getattr(account_info, 'user_id', None))
            username = getattr(account_info, 'username', request.username)
            account_type = getattr(account_info, 'account_type', 'PERSONAL')
        
        session_data = {
            'username': username,
            'user_id': user_id,
            'account_type': account_type,
        }
        
        # Store client instance (in production, use proper session management)
        active_sessions[request.username] = cl
        
        # Save session data to file for persistence
        save_instagram_session(request.username, session_data)
        
        logger.info(f"Successfully logged in user: {request.username}")
        
        return JSONResponse({
            "success": True,
            "data": session_data,
            "message": "Successfully connected to Instagram"
        })
        
    except BadPassword:
        logger.error("Invalid password")
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        error_msg = str(e)
        
        # Check for 2FA requirement
        if "Two-factor authentication" in error_msg or "verification_code" in error_msg:
            raise HTTPException(
                status_code=202,  # Accepted - pending 2FA verification
                detail={
                    "requires_2fa": True,
                    "message": "Two-factor authentication required. Please enter your verification code."
                }
            )
        
        if "User not found" in error_msg or "Invalid user" in error_msg:
            raise HTTPException(status_code=404, detail="User not found")
        
        raise HTTPException(status_code=500, detail=f"Login failed: {error_msg}")


@app.post("/api/instagram/upload-reel")
async def upload_reel(file: UploadFile = File(...), caption: str = Form(""), share_to_feed: bool = Form(True)):
    """
    Upload a Reel video to Instagram
    """
    temp_path = None  # Initialize temp_path
    try:
        # In a real implementation, you'd get the username from the session
        # For now, we'll use the first active session
        if not active_sessions:
            raise HTTPException(status_code=401, detail="Not logged in")
        
        username = list(active_sessions.keys())[0]
        cl = active_sessions[username]
        
        # Save uploaded file temporarily
        temp_path = f"/tmp/{file.filename}"
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Upload video as reel
        result = cl.clip_upload(
            path=temp_path,
            caption=caption
        )
        
        # Clean up temp file
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        
        # Handle both dict and object responses
        if isinstance(result, dict):
            media_id = result.get('pk')
            code = result.get('code', 'unknown')
        else:
            # If it's an object, access attributes directly
            media_id = getattr(result, 'pk', getattr(result, 'id', None))
            code = getattr(result, 'code', 'unknown')
        
        logger.info(f"Successfully uploaded reel: {code}")
        
        return JSONResponse({
            "success": True,
            "data": {
                "media_id": media_id,
                "code": code,
                "share_to_feed": share_to_feed
            },
            "message": "Reel uploaded successfully"
        })
        
    except LoginRequired:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=401, detail="Session expired. Please login again.")
    
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/api/instagram/logout")
async def logout(request: LogoutRequest):
    """
    Logout from Instagram
    """
    try:
        if request.username in active_sessions:
            del active_sessions[request.username]
            logger.info(f"Logged out user: {request.username}")
        
        # Remove session from file
        remove_instagram_session(request.username)
        
        return JSONResponse({
            "success": True,
            "message": "Successfully logged out"
        })
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Logout failed: {str(e)}")


@app.get("/api/instagram/account-info")
async def get_account_info(username: str):
    """
    Get Instagram account information
    """
    try:
        if username not in active_sessions:
            raise HTTPException(status_code=401, detail="Not logged in")
        
        cl = active_sessions[username]
        account_info = cl.account_info()
        
        # Handle both dict and object responses
        if isinstance(account_info, dict):
            return JSONResponse({
                "success": True,
                "data": {
                    "username": account_info.get('username'),
                    "full_name": account_info.get('full_name'),
                    "biography": account_info.get('biography'),
                    "follower_count": account_info.get('follower_count'),
                    "following_count": account_info.get('following_count'),
                    "media_count": account_info.get('media_count'),
                    "profile_pic_url": account_info.get('profile_pic_url'),
                }
            })
        else:
            # If it's an object, access attributes directly
            # Convert HttpUrl objects to strings
            profile_pic_url = getattr(account_info, 'profile_pic_url', None)
            if profile_pic_url is not None:
                profile_pic_url = str(profile_pic_url)
            
            return JSONResponse({
                "success": True,
                "data": {
                    "username": getattr(account_info, 'username', None),
                    "full_name": getattr(account_info, 'full_name', None),
                    "biography": getattr(account_info, 'biography', None),
                    "follower_count": getattr(account_info, 'follower_count', 0),
                    "following_count": getattr(account_info, 'following_count', 0),
                    "media_count": getattr(account_info, 'media_count', 0),
                    "profile_pic_url": profile_pic_url,
                }
            })
    except Exception as e:
        logger.error(f"Get account info error: {str(e)}")
        # Return a simpler response if there's an error
        return JSONResponse({
            "success": True,
            "data": {
                "username": username,
                "full_name": None,
                "biography": None,
                "follower_count": 0,
                "following_count": 0,
                "media_count": 0,
                "profile_pic_url": None,
            }
        })


@app.get("/api/youtube/auth-url")
async def get_youtube_auth_url():
    """
    Get YouTube OAuth authorization URL
    """
    try:
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": YOUTUBE_CLIENT_ID,
                    "client_secret": YOUTUBE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [YOUTUBE_REDIRECT_URI]
                }
            },
            scopes=YOUTUBE_SCOPES
        )
        flow.redirect_uri = YOUTUBE_REDIRECT_URI
        
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        
        return JSONResponse({
            "success": True,
            "data": {
                "auth_url": authorization_url,
                "state": state
            }
        })
    except Exception as e:
        logger.error(f"YouTube auth URL error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate auth URL: {str(e)}")


@app.post("/api/youtube/login")
async def youtube_login(request: YouTubeAuthRequest):
    """
    Exchange authorization code for YouTube access token
    """
    try:
        if not request.code:
            raise HTTPException(status_code=400, detail="Authorization code required")
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": YOUTUBE_CLIENT_ID,
                    "client_secret": YOUTUBE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [YOUTUBE_REDIRECT_URI]
                }
            },
            scopes=YOUTUBE_SCOPES
        )
        flow.redirect_uri = YOUTUBE_REDIRECT_URI
        
        # Exchange code for credentials
        flow.fetch_token(code=request.code)
        credentials = flow.credentials
        
        # Build YouTube service
        youtube = build('youtube', 'v3', credentials=credentials)
        
        # Get channel info
        channel_response = youtube.channels().list(part='snippet,statistics', mine=True).execute()
        
        if not channel_response.get('items'):
            raise HTTPException(status_code=404, detail="No YouTube channel found")
        
        channel = channel_response['items'][0]
        user_id = channel['id']
        
        # Store credentials
        youtube_sessions[user_id] = {
            'credentials': {
                'token': credentials.token,
                'refresh_token': credentials.refresh_token,
                'token_uri': credentials.token_uri,
                'client_id': credentials.client_id,
                'client_secret': credentials.client_secret,
                'scopes': credentials.scopes
            },
            'channel': {
                'id': user_id,
                'title': channel['snippet']['title'],
                'subscriber_count': channel['statistics'].get('subscriberCount', 0)
            }
        }
        
        logger.info(f"YouTube login successful for user: {user_id}")
        
        return JSONResponse({
            "success": True,
            "data": {
                "user_id": user_id,
                "channel_title": channel['snippet']['title'],
                "subscriber_count": channel['statistics'].get('subscriberCount', 0)
            },
            "message": "Successfully connected to YouTube"
        })
        
    except Exception as e:
        logger.error(f"YouTube login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@app.post("/api/youtube/upload-short")
async def upload_youtube_short(
    file: UploadFile = File(...),
    title: str = Form(""),
    description: str = Form(""),
    user_id: str = Form("")
):
    """
    Upload a video as YouTube Short
    """
    temp_path = None  # Initialize temp_path
    try:
        logger.info(f"YouTube upload attempt for user_id: {user_id}")
        logger.info(f"Available sessions: {list(youtube_sessions.keys())}")
        
        if not user_id or user_id not in youtube_sessions:
            raise HTTPException(status_code=401, detail="Not logged in")
        
        session = youtube_sessions[user_id]
        creds_dict = session['credentials']
        
        # Recreate credentials object
        credentials = Credentials(
            token=creds_dict['token'],
            refresh_token=creds_dict['refresh_token'],
            token_uri=creds_dict['token_uri'],
            client_id=creds_dict['client_id'],
            client_secret=creds_dict['client_secret'],
            scopes=creds_dict['scopes']
        )
        
        # Refresh token if expired
        if credentials.expired:
            credentials.refresh(Request())
            # Update stored credentials
            youtube_sessions[user_id]['credentials'] = {
                'token': credentials.token,
                'refresh_token': credentials.refresh_token,
                'token_uri': credentials.token_uri,
                'client_id': credentials.client_id,
                'client_secret': credentials.client_secret,
                'scopes': credentials.scopes
            }
        
        # Build YouTube service
        youtube = build('youtube', 'v3', credentials=credentials)
        
        # Save uploaded file temporarily
        temp_path = f"/tmp/{file.filename}"
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Ensure title includes #Shorts for proper classification
        if title and "#Shorts" not in title:
            title = f"{title} #Shorts"
        elif not title:
            title = "My YouTube Short #Shorts"
        
        # Upload video
        body = {
            'snippet': {
                'title': title,
                'description': description,
                'categoryId': '24'  # Entertainment category
            },
            'status': {
                'privacyStatus': 'public'
            }
        }
        
        media = MediaFileUpload(temp_path, chunksize=-1, resumable=True)
        
        insert_request = youtube.videos().insert(
            part='snippet,status',
            body=body,
            media_body=media
        )
        
        response = insert_request.execute()
        
        # Clean up temp file
        os.remove(temp_path)
        
        logger.info(f"YouTube Short uploaded successfully: {response['id']}")
        
        return JSONResponse({
            "success": True,
            "data": {
                "video_id": response['id'],
                "title": response['snippet']['title'],
                "url": f"https://www.youtube.com/watch?v={response['id']}"
            },
            "message": "YouTube Short uploaded successfully"
        })
        
    except Exception as e:
        logger.error(f"YouTube upload error: {str(e)}")
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/api/youtube/logout")
async def youtube_logout(request: YouTubeLogoutRequest):
    """
    Logout from YouTube
    """
    try:
        if request.user_id in youtube_sessions:
            del youtube_sessions[request.user_id]
            logger.info(f"YouTube logout successful for user: {request.user_id}")
        
        return JSONResponse({
            "success": True,
            "message": "Successfully logged out from YouTube"
        })
    except Exception as e:
        logger.error(f"YouTube logout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Logout failed: {str(e)}")


# ============================================================================
# TikTok API Endpoints
# ============================================================================

@app.get("/api/tiktok/auth-url")
async def get_tiktok_auth_url():
    """
    Generate TikTok OAuth URL for user authorization
    """
    try:
        # TikTok OAuth authorization URL
        auth_url = (
            f"https://www.tiktok.com/v2/auth/authorize/"
            f"?client_key={TIKTOK_CLIENT_KEY}"
            f"&scope={','.join(TIKTOK_SCOPES)}"
            f"&response_type=code"
            f"&redirect_uri={TIKTOK_REDIRECT_URI}"
            f"&state={''.join(__import__('random').choices(__import__('string').ascii_letters + __import__('string').digits, k=32))}"
        )
        
        return JSONResponse({
            "success": True,
            "auth_url": auth_url
        })
    except Exception as e:
        logger.error(f"TikTok auth URL generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate auth URL: {str(e)}")


@app.post("/api/tiktok/login")
async def tiktok_login(request: YouTubeAuthRequest):  # Reuse the same request model
    """
    Exchange TikTok authorization code for access token
    """
    try:
        import requests
        
        if not request.code:
            raise HTTPException(status_code=400, detail="Authorization code is required")
        
        # Exchange code for access token
        token_url = "https://open.tiktokapis.com/v2/oauth/token/"
        token_data = {
            "client_key": TIKTOK_CLIENT_KEY,
            "client_secret": TIKTOK_CLIENT_SECRET,
            "code": request.code,
            "grant_type": "authorization_code",
            "redirect_uri": TIKTOK_REDIRECT_URI
        }
        
        token_response = requests.post(token_url, json=token_data)
        token_result = token_response.json()
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail=token_result.get("message", "Failed to get access token"))
        
        access_token = token_result.get("access_token")
        open_id = token_result.get("open_id")
        
        if not access_token or not open_id:
            raise HTTPException(status_code=400, detail="Invalid token response")
        
        # Get user info
        user_info_url = "https://open.tiktokapis.com/v2/user/info/"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        params = {"fields": "open_id,union_id,avatar_url,display_name"}
        
        user_response = requests.get(user_info_url, headers=headers, params=params)
        user_result = user_response.json()
        
        if user_response.status_code != 200:
            logger.warning(f"Failed to get TikTok user info: {user_result}")
            # Continue anyway with basic info
            user_data = {
                "open_id": open_id,
                "display_name": "TikTok User"
            }
        else:
            user_data = user_result.get("data", {}).get("user", {})
        
        # Store session
        tiktok_sessions[open_id] = {
            "access_token": access_token,
            "open_id": open_id,
            "display_name": user_data.get("display_name", "TikTok User"),
            "avatar_url": user_data.get("avatar_url", "")
        }
        
        logger.info(f"TikTok login successful for user: {open_id}")
        
        return JSONResponse({
            "success": True,
            "user_id": open_id,
            "display_name": user_data.get("display_name", "TikTok User"),
            "avatar_url": user_data.get("avatar_url", "")
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TikTok login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@app.post("/api/tiktok/upload-video")
async def upload_tiktok_video(
    video: UploadFile = File(...),
    title: str = Form(""),
    description: str = Form(""),
    user_id: str = Form("")
):
    """
    Upload video to TikTok
    """
    temp_path = None
    try:
        import requests
        
        logger.info(f"TikTok upload attempt for user_id: {user_id}")
        logger.info(f"Available sessions: {list(tiktok_sessions.keys())}")
        
        # Validate user session
        if not user_id or user_id not in tiktok_sessions:
            raise HTTPException(status_code=401, detail="Not logged in to TikTok")
        
        session = tiktok_sessions[user_id]
        access_token = session["access_token"]
        
        # Save video temporarily
        temp_path = f"/tmp/tiktok_upload_{user_id}_{video.filename}"
        with open(temp_path, "wb") as f:
            f.write(await video.read())
        
        file_size = os.path.getsize(temp_path)
        
        # Step 1: Initialize upload
        init_url = "https://open.tiktokapis.com/v2/post/publish/video/init/"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        init_data = {
            "post_info": {
                "title": title or "Posted via Cast",
                "description": description or "",
                "privacy_level": "SELF_ONLY",  # Start with private
                "disable_duet": False,
                "disable_comment": False,
                "disable_stitch": False,
                "video_cover_timestamp_ms": 1000
            },
            "source_info": {
                "source": "FILE_UPLOAD",
                "video_size": file_size,
                "chunk_size": file_size,
                "total_chunk_count": 1
            }
        }
        
        init_response = requests.post(init_url, headers=headers, json=init_data)
        init_result = init_response.json()
        
        if init_response.status_code != 200:
            raise HTTPException(status_code=400, detail=init_result.get("message", "Failed to initialize upload"))
        
        upload_url = init_result.get("data", {}).get("upload_url")
        publish_id = init_result.get("data", {}).get("publish_id")
        
        if not upload_url or not publish_id:
            raise HTTPException(status_code=400, detail="Invalid init response")
        
        # Step 2: Upload video file
        with open(temp_path, "rb") as f:
            upload_headers = {
                "Content-Type": "video/mp4",
                "Content-Length": str(file_size)
            }
            upload_response = requests.put(upload_url, headers=upload_headers, data=f)
        
        if upload_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to upload video file")
        
        # Clean up temp file
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
            temp_path = None
        
        logger.info(f"TikTok video uploaded successfully for user: {user_id}")
        
        return JSONResponse({
            "success": True,
            "message": "Video uploaded to TikTok successfully",
            "publish_id": publish_id
        })
        
    except HTTPException:
        # Clean up temp file on error
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        raise
    except Exception as e:
        # Clean up temp file on error
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        logger.error(f"TikTok upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/api/tiktok/logout")
async def tiktok_logout(request: TikTokLogoutRequest):
    """
    Logout from TikTok
    """
    try:
        if request.user_id in tiktok_sessions:
            del tiktok_sessions[request.user_id]
            logger.info(f"TikTok logout successful for user: {request.user_id}")
        
        return JSONResponse({
            "success": True,
            "message": "Successfully logged out from TikTok"
        })
    except Exception as e:
        logger.error(f"TikTok logout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Logout failed: {str(e)}")


@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {"status": "healthy", "service": "Social Media API"}


# Load existing sessions on startup
def load_existing_sessions():
    """Load existing sessions from file on startup"""
    try:
        sessions = load_instagram_sessions()
        logger.info(f"Found {len(sessions)} saved Instagram sessions")
        
        # Note: We don't restore the actual Client instances here
        # as they would need to be re-authenticated. Instead, we just
        # log that sessions exist and let users re-login if needed.
        
        for username, session_data in sessions.items():
            logger.info(f"Saved session for user: {username}")
            
    except Exception as e:
        logger.error(f"Failed to load existing sessions: {e}")

# Load sessions on startup
load_existing_sessions()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
