from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
from instagrapi import Client
from instagrapi.exceptions import LoginRequired, BadPassword
from instagram_graph_api import InstagramGraphAPI
import os
import json
import pickle
from typing import Optional
import logging
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from dotenv import load_dotenv
import logging.config

# Load environment variables from .env file
load_dotenv()

# Configure logging with health check filter
class HealthCheckFilter(logging.Filter):
    def filter(self, record):
        # Filter out health check requests - more comprehensive filtering
        message = str(record.getMessage()) if hasattr(record, 'getMessage') else str(record)
        return not any([
            'GET /health HTTP/1.1' in message,
            '/health HTTP/1.1' in message,
            'GET /health' in message,
            'health HTTP' in message
        ])

# Set up logging configuration
logging.basicConfig(
    level=logging.WARNING,  # Change to WARNING to reduce noise
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configure uvicorn access logger to be silent for health checks
uvicorn_access = logging.getLogger("uvicorn.access")
uvicorn_access.setLevel(logging.WARNING)
uvicorn_access.addFilter(HealthCheckFilter())

# Social Media Event Logger
social_logger = logging.getLogger("social_media")
social_logger.setLevel(logging.INFO)

app = FastAPI(title="Social Media API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://cast-five.vercel.app",
        "https://cast-git-main-eliyahuelazarov-8580s-projects.vercel.app",
        "https://*.vercel.app"  # Allow all Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active sessions (in production, use Redis or database)
active_sessions = {}  # Store Instagram (instagrapi) sessions
youtube_sessions = {}  # Store YouTube credentials
tiktok_sessions = {}  # Store TikTok credentials
instagram_meta_sessions = {}  # Store Instagram Meta API credentials
instagram_graph_sessions = {}  # Store Instagram Graph API credentials

# Initialize Instagram Graph API
instagram_graph_api = InstagramGraphAPI()

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

# Meta/Instagram OAuth configuration  
META_APP_ID = os.getenv('META_APP_ID', '')
META_APP_SECRET = os.getenv('META_APP_SECRET', '')
META_REDIRECT_URI = f'{BASE_URL}/auth/instagram/callback' if BASE_URL else None
# Instagram Content Publishing API scopes
META_INSTAGRAM_SCOPES = [
    'instagram_basic',
    'pages_show_list',
    'pages_read_engagement',
    'business_management',
    'instagram_content_publish',
    'instagram_manage_comments',
    'instagram_manage_insights'
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
        logger.info(f"Instagram login attempt for user: {request.username}, has_verification_code: {bool(request.verification_code)}")
        
        # Check if we have an existing client session for 2FA
        if request.verification_code and request.username in active_sessions:
            # Use existing client for 2FA completion
            logger.info(f"Using existing client for 2FA completion for user: {request.username}")
            cl = active_sessions[request.username]
            # Complete the 2FA login
            cl.login(request.username, request.password, verification_code=request.verification_code)
        else:
            # Create new client for initial login
            cl = Client()
            
            # Attempt login
            if request.verification_code:
                # 2FA login with new client - this shouldn't happen normally
                cl.login(request.username, request.password, verification_code=request.verification_code)
            else:
                # Regular login - this might trigger 2FA
                try:
                    cl.login(request.username, request.password)
                except Exception as e:
                    # If this is a 2FA challenge, store the client and re-raise
                    if "Two-factor authentication" in str(e) or "verification_code" in str(e) or "challenge_required" in str(e):
                        logger.info(f"2FA challenge detected for user: {request.username}, storing client")
                        active_sessions[request.username] = cl
                        raise e
                    else:
                        raise e
        
        # Get account info
        account_info = cl.account_info()
        
        # Store session data
        # Handle both dict and object responses
        if isinstance(account_info, dict):
            user_id = account_info.get('pk', account_info.get('user_id'))
            username = account_info.get('username', request.username)
            account_type = account_info.get('account_type', 'PERSONAL')
            follower_count = account_info.get('follower_count', 0)
        else:
            # If it's an object, access attributes directly
            user_id = getattr(account_info, 'pk', getattr(account_info, 'user_id', None))
            username = getattr(account_info, 'username', request.username)
            account_type = getattr(account_info, 'account_type', 'PERSONAL')
            follower_count = getattr(account_info, 'follower_count', 0)
        
        session_data = {
            'username': username,
            'user_id': user_id,
            'account_type': account_type,
        }
        
        # Store client instance (in production, use proper session management)
        active_sessions[request.username] = cl
        
        # Save session data to file for persistence
        save_instagram_session(request.username, session_data)
        
        # Log Instagram connection event
        social_logger.info(f"INSTAGRAM_CONNECTED - User: {username} | ID: {user_id} | Type: {account_type} | Followers: {follower_count}")
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
        if "Two-factor authentication" in error_msg or "verification_code" in error_msg or "challenge_required" in error_msg:
            logger.info(f"2FA required for user: {request.username}, error: {error_msg}")
            # Store the client for 2FA completion (if not already stored)
            if request.username not in active_sessions:
                cl = Client()
                active_sessions[request.username] = cl
                logger.info(f"Stored new client for 2FA completion for user: {request.username}")
                
            raise HTTPException(
                status_code=202,  # Accepted - pending 2FA verification
                detail={
                    "requires_2fa": True,
                    "message": "Two-factor authentication required. Please enter your verification code."
                }
            )
        
        if "User not found" in error_msg or "Invalid user" in error_msg:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Clean up failed session
        if request.username in active_sessions:
            del active_sessions[request.username]
            
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
        social_logger.info(f"INSTAGRAM_UPLOAD_START - User: {username} | File: {file.filename} | Caption: {caption[:50]}...")
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
        
        # Log successful upload
        social_logger.info(f"INSTAGRAM_UPLOAD_SUCCESS - User: {username} | Media ID: {media_id} | Code: {code} | Share to Feed: {share_to_feed}")
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
        social_logger.error(f"INSTAGRAM_UPLOAD_FAILED - Username: {username} | File: {file.filename} | Error: {str(e)}")
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


# ============================================================================
# Instagram Meta API Endpoints (Official Meta/Facebook Graph API)
# ============================================================================

@app.get("/api/instagram/meta/auth-url")
async def get_instagram_meta_auth_url():
    """
    Get Instagram Meta OAuth authorization URL
    """
    try:
        import secrets
        state = secrets.token_urlsafe(32)
        
        # Meta OAuth URL for Instagram Business
        auth_url = (
            f"https://www.facebook.com/v18.0/dialog/oauth?"
            f"client_id={META_APP_ID}"
            f"&redirect_uri={META_REDIRECT_URI}"
            f"&scope={','.join(META_INSTAGRAM_SCOPES)}"
            f"&response_type=code"
            f"&state={state}"
        )
        
        return JSONResponse({
            "success": True,
            "data": {
                "auth_url": auth_url,
                "state": state
            }
        })
    except Exception as e:
        logger.error(f"Instagram Meta auth URL error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate auth URL: {str(e)}")


@app.get("/auth/instagram/callback")
async def instagram_meta_oauth_callback(code: str = None, state: str = None, error: str = None, error_description: str = None):
    """
    Handle Instagram Meta OAuth callback - redirect to frontend
    """
    try:
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        
        if error:
            error_msg = error_description or error
            social_logger.error(f"INSTAGRAM_META_OAUTH_ERROR - Error: {error_msg}")
            logger.error(f"Instagram Meta OAuth error: {error_msg}")
            return RedirectResponse(url=f"{frontend_url}/?instagram_error={error}")
        
        if not code:
            social_logger.error("INSTAGRAM_META_OAUTH_ERROR - No authorization code received")
            logger.error("No authorization code received")
            return RedirectResponse(url=f"{frontend_url}/?instagram_error=no_code")
        
        # Log successful callback
        social_logger.info(f"INSTAGRAM_META_OAUTH_CALLBACK - Code received: {code[:10]}... | State: {state}")
        
        # Redirect to frontend callback page with the code
        redirect_url = f"{frontend_url}/auth/instagram/callback?code={code}"
        if state:
            redirect_url += f"&state={state}"
        
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        social_logger.error(f"INSTAGRAM_META_OAUTH_CALLBACK_ERROR - Error: {str(e)}")
        logger.error(f"Instagram Meta OAuth callback error: {str(e)}")
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return RedirectResponse(url=f"{frontend_url}/?instagram_error=callback_failed")


@app.post("/api/instagram/meta/login")
async def instagram_meta_login(request: dict):
    """
    Exchange authorization code for Instagram Meta access token
    """
    try:
        import requests
        
        code = request.get('code')
        if not code:
            raise HTTPException(status_code=400, detail="Authorization code required")
        
        # Exchange code for access token
        token_url = "https://graph.facebook.com/v18.0/oauth/access_token"
        token_params = {
            "client_id": META_APP_ID,
            "client_secret": META_APP_SECRET,
            "redirect_uri": META_REDIRECT_URI,
            "code": code
        }
        
        token_response = requests.get(token_url, params=token_params)
        token_data = token_response.json()
        
        if 'access_token' not in token_data:
            error_msg = token_data.get('error', {}).get('message', 'Failed to get access token')
            raise HTTPException(status_code=400, detail=error_msg)
        
        access_token = token_data['access_token']
        
        # Get Facebook Pages
        pages_url = "https://graph.facebook.com/v18.0/me/accounts"
        pages_response = requests.get(pages_url, params={"access_token": access_token})
        pages_data = pages_response.json()
        
        if 'data' not in pages_data or len(pages_data['data']) == 0:
            raise HTTPException(
                status_code=404, 
                detail="No Facebook Pages found. You need to connect your Instagram account to a Facebook Page first."
            )
        
        # Get first page (could be extended to let user select from multiple pages)
        page = pages_data['data'][0]
        page_id = page['id']
        page_access_token = page['access_token']
        
        # Get Instagram Business Account ID
        ig_account_url = f"https://graph.facebook.com/v18.0/{page_id}"
        ig_account_response = requests.get(
            ig_account_url,
            params={
                "fields": "instagram_business_account",
                "access_token": page_access_token
            }
        )
        ig_account_data = ig_account_response.json()
        
        if 'instagram_business_account' not in ig_account_data:
            raise HTTPException(
                status_code=404,
                detail="No Instagram Business Account found. Connect your Instagram Business account to the Facebook Page."
            )
        
        ig_user_id = ig_account_data['instagram_business_account']['id']
        
        # Get Instagram account info
        ig_info_url = f"https://graph.facebook.com/v18.0/{ig_user_id}"
        ig_info_response = requests.get(
            ig_info_url,
            params={
                "fields": "username,profile_picture_url,followers_count,media_count",
                "access_token": page_access_token
            }
        )
        ig_info = ig_info_response.json()
        
        # Store session
        instagram_meta_sessions[ig_user_id] = {
            'access_token': page_access_token,
            'ig_user_id': ig_user_id,
            'username': ig_info.get('username'),
            'page_id': page_id,
            'followers_count': ig_info.get('followers_count', 0),
            'media_count': ig_info.get('media_count', 0)
        }
        
        # Log Instagram Meta connection event
        social_logger.info(f"INSTAGRAM_META_CONNECTED - User: {ig_info.get('username')} | ID: {ig_user_id} | Followers: {ig_info.get('followers_count', 0)}")
        logger.info(f"Instagram Meta login successful for user: {ig_user_id}")
        
        return JSONResponse({
            "success": True,
            "data": {
                "user_id": ig_user_id,
                "username": ig_info.get('username'),
                "followers_count": ig_info.get('followers_count', 0),
                "media_count": ig_info.get('media_count', 0),
                "profile_picture_url": ig_info.get('profile_picture_url'),
                "account_type": "business"  # Meta API only works with business accounts
            },
            "message": "Successfully connected to Instagram"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Instagram Meta login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@app.post("/api/instagram/meta/logout")
async def instagram_meta_logout(request: dict):
    """
    Logout from Instagram Meta API
    """
    try:
        user_id = request.get('user_id')
        if user_id and user_id in instagram_meta_sessions:
            del instagram_meta_sessions[user_id]
            logger.info(f"Instagram Meta logout successful for user: {user_id}")
        
        return JSONResponse({
            "success": True,
            "message": "Successfully logged out from Instagram"
        })
    except Exception as e:
        logger.error(f"Instagram Meta logout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Logout failed: {str(e)}")


# Instagram Graph API Endpoints (2025)
@app.get("/api/instagram/graph/auth-url")
async def instagram_graph_auth_url():
    """
    Get Instagram Graph API authorization URL
    """
    try:
        if not instagram_graph_api.validate_credentials():
            raise HTTPException(status_code=500, detail="Instagram Graph API credentials not configured")
            
        auth_url = instagram_graph_api.get_auth_url()
        
        return JSONResponse({
            "success": True,
            "auth_url": auth_url
        })
    except Exception as e:
        logger.error(f"Instagram Graph auth URL error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate auth URL: {str(e)}")


@app.post("/api/instagram/graph/login")
async def instagram_graph_login(request: dict):
    """
    Complete Instagram Graph API OAuth flow
    """
    try:
        code = request.get('code')
        if not code:
            raise HTTPException(status_code=400, detail="Authorization code required")
            
        logger.info(f"Instagram Graph login attempt with code: {code[:10]}...")
        
        # Step 1: Exchange code for access token
        try:
            token_data = instagram_graph_api.exchange_code_for_token(code)
            access_token = token_data['access_token']
            logger.info(f"Successfully exchanged code for access token")
        except Exception as e:
            logger.error(f"Token exchange failed: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Token exchange failed: {str(e)}")
        
        # Step 2: Get long-lived token
        try:
            long_lived_token = instagram_graph_api.get_long_lived_token(access_token)
            logger.info(f"Successfully got long-lived token")
        except Exception as e:
            logger.error(f"Long-lived token failed: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Long-lived token failed: {str(e)}")
        
        # Step 3: Get user's Facebook pages
        try:
            pages_data = instagram_graph_api.get_user_pages(long_lived_token)
            logger.info(f"Got pages data: {pages_data}")
        except Exception as e:
            logger.error(f"Get pages failed: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Get pages failed: {str(e)}")
        
        if not pages_data.get('data'):
            logger.error("No Facebook pages found for user")
            raise HTTPException(
                status_code=400, 
                detail={
                    "error": "No Facebook pages found",
                    "message": "To use Instagram Graph API, you need to connect your Instagram Business account to a Facebook page. Please:",
                    "steps": [
                        "1. Go to your Facebook page",
                        "2. Connect your Instagram Business account to the page",
                        "3. Make sure your Instagram account is set to Business or Creator",
                        "4. Try connecting again"
                    ],
                    "help_url": "https://www.facebook.com/help/instagram/182333492962771"
                }
            )
            
        # Find page with Instagram Business account
        ig_user_id = None
        page_id = None
        page_access_token = None
        
        for page in pages_data['data']:
            try:
                ig_data = instagram_graph_api.get_instagram_account(page['id'], page['access_token'])
                if ig_data.get('instagram_business_account'):
                    ig_user_id = ig_data['instagram_business_account']['id']
                    page_id = page['id']
                    page_access_token = page['access_token']
                    break
            except Exception:
                continue
                
        if not ig_user_id:
            logger.error("No Instagram Business account found connected to Facebook pages")
            raise HTTPException(
                status_code=400, 
                detail={
                    "error": "No Instagram Business account found",
                    "message": "Your Facebook page is not connected to an Instagram Business account. Please:",
                    "steps": [
                        "1. Make sure your Instagram account is set to Business or Creator",
                        "2. Go to your Facebook page settings",
                        "3. Connect your Instagram Business account to the page",
                        "4. Try connecting again"
                    ],
                    "help_url": "https://www.facebook.com/help/instagram/182333492962771"
                }
            )
            
        # Step 4: Get Instagram user info
        ig_user_info = instagram_graph_api.get_instagram_user_info(ig_user_id, page_access_token)
        
        # Store session
        instagram_graph_sessions[ig_user_id] = {
            'access_token': page_access_token,
            'ig_user_id': ig_user_id,
            'username': ig_user_info.get('username'),
            'page_id': page_id,
            'followers_count': ig_user_info.get('followers_count', 0),
            'media_count': ig_user_info.get('media_count', 0),
            'account_type': ig_user_info.get('account_type', 'BUSINESS')
        }
        
        logger.info(f"Instagram Graph login successful for user: {ig_user_info.get('username')}")
        
        return JSONResponse({
            "success": True,
            "data": {
                "user_id": ig_user_id,
                "username": ig_user_info.get('username'),
                "followers_count": ig_user_info.get('followers_count', 0),
                "media_count": ig_user_info.get('media_count', 0),
                "account_type": "BUSINESS"
            },
            "message": "Successfully connected to Instagram"
        })
        
    except Exception as e:
        logger.error(f"Instagram Graph login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@app.post("/api/instagram/graph/logout")
async def instagram_graph_logout(request: dict):
    """
    Logout from Instagram Graph API
    """
    try:
        user_id = request.get('user_id')
        if user_id and user_id in instagram_graph_sessions:
            del instagram_graph_sessions[user_id]
            logger.info(f"Instagram Graph logout successful for user: {user_id}")
            
        return JSONResponse({
            "success": True,
            "message": "Successfully logged out from Instagram"
        })
    except Exception as e:
        logger.error(f"Instagram Graph logout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Logout failed: {str(e)}")


@app.post("/api/instagram/graph/upload-reel")
async def instagram_graph_upload_reel(file: UploadFile = File(...), caption: str = Form(""), user_id: str = Form(...)):
    """
    Upload and publish Instagram Reel using Graph API
    """
    try:
        if user_id not in instagram_graph_sessions:
            raise HTTPException(status_code=401, detail="User not authenticated")
            
        session = instagram_graph_sessions[user_id]
        ig_user_id = session['ig_user_id']
        access_token = session['access_token']
        
        # Upload and publish reel
        result = instagram_graph_api.upload_and_publish_reel(
            ig_user_id=ig_user_id,
            access_token=access_token,
            video_file=file.file,
            caption=caption
        )
        
        logger.info(f"Instagram Reel published successfully for user: {session['username']}")
        
        return JSONResponse({
            "success": True,
            "data": result,
            "message": "Reel published successfully"
        })
        
    except Exception as e:
        logger.error(f"Instagram Graph upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


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


@app.get("/auth/youtube/callback")
async def youtube_oauth_callback(code: str = None, state: str = None, error: str = None):
    """
    Handle YouTube OAuth callback - redirect to frontend
    """
    try:
        # Get frontend URL from environment or use a default
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        
        if error:
            social_logger.error(f"YOUTUBE_OAUTH_ERROR - Error: {error}")
            logger.error(f"YouTube OAuth error: {error}")
            # Redirect to frontend with error
            return RedirectResponse(url=f"{frontend_url}/?youtube_error={error}")
        
        if not code:
            social_logger.error("YOUTUBE_OAUTH_ERROR - No authorization code received")
            logger.error("No authorization code received")
            # Redirect to frontend with error
            return RedirectResponse(url=f"{frontend_url}/?youtube_error=no_code")
        
        # Log successful callback
        social_logger.info(f"YOUTUBE_OAUTH_CALLBACK - Code received: {code[:10]}... | State: {state}")
        
        # Redirect to frontend callback page with the code
        redirect_url = f"{frontend_url}/auth/youtube/callback?code={code}"
        if state:
            redirect_url += f"&state={state}"
        
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        social_logger.error(f"YOUTUBE_OAUTH_CALLBACK_ERROR - Error: {str(e)}")
        logger.error(f"YouTube OAuth callback error: {str(e)}")
        # Redirect to frontend with error
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return RedirectResponse(url=f"{frontend_url}/?youtube_error=callback_failed")


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
        
        # Log YouTube connection event
        social_logger.info(f"YOUTUBE_CONNECTED - Channel: {channel['snippet']['title']} | ID: {user_id} | Subscribers: {channel['statistics'].get('subscriberCount', 0)}")
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
            credentials.refresh(GoogleRequest())
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
        social_logger.info(f"YOUTUBE_UPLOAD_START - User: {user_id} | File: {file.filename} | Title: {title}")
        
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
        
        # Log successful upload
        social_logger.info(f"YOUTUBE_UPLOAD_SUCCESS - User: {user_id} | Video ID: {response['id']} | Title: {title} | URL: https://www.youtube.com/watch?v={response['id']}")
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
        social_logger.error(f"YOUTUBE_UPLOAD_FAILED - User: {user_id} | File: {file.filename} | Error: {str(e)}")
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


@app.get("/auth/tiktok/callback")
async def tiktok_oauth_callback(code: str = None, state: str = None, error: str = None):
    """
    Handle TikTok OAuth callback - redirect to frontend
    """
    try:
        # Get frontend URL from environment or use a default
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        
        if error:
            social_logger.error(f"TIKTOK_OAUTH_ERROR - Error: {error}")
            logger.error(f"TikTok OAuth error: {error}")
            # Redirect to frontend with error
            return RedirectResponse(url=f"{frontend_url}/?tiktok_error={error}")
        
        if not code:
            social_logger.error("TIKTOK_OAUTH_ERROR - No authorization code received")
            logger.error("No authorization code received")
            # Redirect to frontend with error
            return RedirectResponse(url=f"{frontend_url}/?tiktok_error=no_code")
        
        # Log successful callback
        social_logger.info(f"TIKTOK_OAUTH_CALLBACK - Code received: {code[:10]}... | State: {state}")
        
        # Redirect to frontend callback page with the code
        redirect_url = f"{frontend_url}/auth/tiktok/callback?code={code}"
        if state:
            redirect_url += f"&state={state}"
        
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        social_logger.error(f"TIKTOK_OAUTH_CALLBACK_ERROR - Error: {str(e)}")
        logger.error(f"TikTok OAuth callback error: {str(e)}")
        # Redirect to frontend with error
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return RedirectResponse(url=f"{frontend_url}/?tiktok_error=callback_failed")


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
        
        # Log TikTok connection event
        social_logger.info(f"TIKTOK_CONNECTED - User: {user_data.get('display_name', 'TikTok User')} | ID: {open_id} | Avatar: {user_data.get('avatar_url', 'N/A')}")
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
        
        # Log TikTok upload start
        social_logger.info(f"TIKTOK_UPLOAD_START - User: {user_id} | File: {video.filename} | Title: {title} | Size: {file_size} bytes")
        
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
        
        # Log successful upload
        social_logger.info(f"TIKTOK_UPLOAD_SUCCESS - User: {user_id} | Publish ID: {publish_id} | Title: {title}")
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
        social_logger.error(f"TIKTOK_UPLOAD_FAILED - User: {user_id} | File: {video.filename} | Error: {str(e)}")
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
    Health check endpoint - silent for monitoring
    """
    return {"status": "healthy", "service": "Social Media API"}


@app.get("/api/instagram/graph/webhook")
async def instagram_webhook_verify(request: Request):
    """
    Verify Instagram webhook subscription
    """
    try:
        # Get verification parameters
        hub_mode = request.query_params.get("hub.mode")
        hub_challenge = request.query_params.get("hub.challenge")
        hub_verify_token = request.query_params.get("hub.verify_token")
        
        # Verify the webhook
        if hub_mode == "subscribe" and hub_verify_token == "instagram_webhook_verify_token_2025":
            logger.info("Instagram webhook verification successful")
            return int(hub_challenge)
        else:
            logger.error(f"Instagram webhook verification failed: mode={hub_mode}, token={hub_verify_token}")
            raise HTTPException(status_code=403, detail="Verification failed")
            
    except Exception as e:
        logger.error(f"Instagram webhook verification error: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook verification error")


@app.post("/api/instagram/graph/webhook")
async def instagram_webhook_receive(request: Request):
    """
    Receive Instagram webhook notifications
    """
    try:
        body = await request.json()
        logger.info(f"Instagram webhook received: {body}")
        
        # Process webhook data here
        # This is where you'd handle Instagram events like media updates, etc.
        
        return {"status": "success", "message": "Webhook received"}
        
    except Exception as e:
        logger.error(f"Instagram webhook processing error: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing error")


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
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        log_level="error",  # Only show errors, not INFO messages
        access_log=False  # Completely disable access logs
    )
