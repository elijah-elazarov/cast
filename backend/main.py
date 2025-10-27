from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
from instagrapi import Client
from instagrapi.exceptions import LoginRequired, BadPassword
from instagram_graph_api import InstagramGraphAPI
from instagram_platform_api import InstagramPlatformAPI
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

# Initialize Instagram Graph API for posting capabilities
instagram_graph_api = InstagramGraphAPI()

# Session persistence
SESSIONS_DIR = "sessions"
INSTAGRAM_SESSIONS_FILE = os.path.join(SESSIONS_DIR, "instagram_sessions.json")
INSTAGRAM_GRAPH_SESSIONS_FILE = os.path.join(SESSIONS_DIR, "instagram_graph_sessions.json")

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

def save_instagram_graph_session(user_id: str, session_data: dict):
    """Save Instagram Graph session data to memory only"""
    # Session is already stored in instagram_graph_sessions dictionary
    logger.info(f"Session stored in memory for user: {user_id}")

def load_instagram_graph_sessions():
    """Load Instagram Graph sessions from memory"""
    return instagram_graph_sessions

def remove_instagram_graph_session(user_id: str):
    """Remove Instagram Graph session from memory"""
    if user_id in instagram_graph_sessions:
        del instagram_graph_sessions[user_id]
        logger.info(f"Removed Instagram Graph session for user: {user_id}")

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

# Instagram OAuth configuration
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
# Instagram Graph API Endpoints (Posting Capabilities)
# ============================================================================

@app.get("/api/instagram/graph/auth-url")
async def get_instagram_graph_auth_url():
    """
    Get Instagram Graph API OAuth authorization URL
    Uses Instagram Graph API for posting capabilities (Reels, Stories, Posts)
    """
    try:
        if not instagram_graph_api.validate_credentials():
            raise HTTPException(status_code=500, detail="Instagram Graph API credentials not configured")
        
        auth_url, state = instagram_graph_api.get_auth_url()
        
        return JSONResponse({
            "success": True,
            "data": {
                "auth_url": auth_url,
                "state": state
            }
        })
    except Exception as e:
        logger.error(f"Instagram Graph auth URL error: {str(e)}")
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


@app.post("/api/instagram/graph/login")
async def instagram_graph_login(request: dict):
    """
    Exchange authorization code for Instagram Graph API access token
    Uses Instagram Graph API for posting capabilities (Reels, Stories, Posts)
    """
    try:
        code = request.get('code')
        if not code:
            raise HTTPException(status_code=400, detail="Authorization code required")
        
        # Step 1: Exchange code for access token
        token_data = instagram_graph_api.exchange_code_for_token(code)
        access_token = token_data['access_token']
        
        # Step 2: Validate access token and get user info
        user_info = instagram_graph_api.get_user_info(access_token)
        logger.info(f"User authenticated: {user_info.get('name', 'Unknown')} (ID: {user_info.get('id', 'Unknown')})")
        
        # Step 3: Get user's Facebook Pages
        pages_data = instagram_graph_api.get_user_pages(access_token)
        
        # Get first page (could be extended to let user select from multiple pages)
        page = pages_data['data'][0]
        page_id = page['id']
        page_access_token = page['access_token']
        
        # Step 3: Get Instagram Business Account from Page
        instagram_account = instagram_graph_api.get_instagram_account_from_page(page_id, page_access_token)
        ig_user_id = instagram_account['id']
        
        # Step 4: Get detailed Instagram account info
        ig_info = instagram_graph_api.get_instagram_user_info(ig_user_id, page_access_token)
        
        # Store session
        instagram_meta_sessions[ig_user_id] = {
            'access_token': page_access_token,
            'ig_user_id': ig_user_id,
            'username': ig_info.get('username'),
            'page_id': page_id,
            'followers_count': ig_info.get('followers_count', 0),
            'media_count': ig_info.get('media_count', 0)
        }
        
        # Log Instagram Graph connection event
        social_logger.info(f"INSTAGRAM_GRAPH_CONNECTED - User: {ig_info.get('username')} | ID: {ig_user_id} | Followers: {ig_info.get('followers_count', 0)}")
        logger.info(f"Instagram Graph login successful for user: {ig_user_id}")
        
        return JSONResponse({
            "success": True,
            "data": {
                "user_id": ig_user_id,
                "username": ig_info.get('username'),
                "followers_count": ig_info.get('followers_count', 0),
                "media_count": ig_info.get('media_count', 0),
                "profile_picture_url": ig_info.get('profile_picture_url'),
                "account_type": "business"  # Graph API only works with business accounts
            },
            "message": "Successfully connected to Instagram"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Instagram Graph login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@app.get("/api/instagram/basic/user-info")
async def get_instagram_basic_user_info(request: Request):
    """
    Get Instagram user information
    """
    try:
        user_id = request.query_params.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID required")
        
        if user_id not in instagram_meta_sessions:
            raise HTTPException(status_code=404, detail="User not found")
        
        session = instagram_meta_sessions[user_id]
        access_token = session['access_token']
        ig_user_id = session['ig_user_id']
        
        user_info = instagram_graph_api.get_instagram_user_info(ig_user_id, access_token)
        
        return JSONResponse({
            "success": True,
            "data": user_info
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Instagram Basic user info error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get user info: {str(e)}")


@app.get("/api/instagram/basic/media")
async def get_instagram_basic_media(request: Request):
    """
    Get Instagram user media
    """
    try:
        user_id = request.query_params.get('user_id')
        limit = int(request.query_params.get('limit', 25))
        
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID required")
        
        if user_id not in instagram_meta_sessions:
            raise HTTPException(status_code=404, detail="User not found")
        
        session = instagram_meta_sessions[user_id]
        access_token = session['access_token']
        
        # Note: Instagram Graph API doesn't have a direct get_user_media method
        # This would need to be implemented or removed
        media_data = {"data": []}
        
        return JSONResponse({
            "success": True,
            "data": media_data
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Instagram Basic media error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get media: {str(e)}")



@app.post("/api/instagram/graph/upload-story")
async def instagram_graph_upload_story(file: UploadFile = File(...), caption: str = Form(""), user_id: str = Form(...)):
    """
    Upload and publish Instagram Story using Graph API
    """
    try:
        if user_id not in instagram_graph_sessions:
            raise HTTPException(status_code=401, detail="User not authenticated")
            
        session = instagram_graph_sessions[user_id]
        ig_user_id = session['ig_user_id']
        access_token = session['access_token']
        
        # Upload and publish story
        result = instagram_graph_api.upload_and_publish_story(
            ig_user_id=ig_user_id,
            access_token=access_token,
            video_file=file,
            caption=caption
        )
        
        logger.info(f"Instagram Story published successfully for user: {session['username']}")
        
        return JSONResponse({
            "success": True,
            "data": result,
            "message": "Story published successfully"
        })
        
    except Exception as e:
        logger.error(f"Instagram Graph story upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Story upload failed: {str(e)}")


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
            logger.info(f"Token data: {token_data}")
            
            # Check if we have granted_scopes in the response
            if 'granted_scopes' in token_data:
                logger.info(f"Granted scopes: {token_data['granted_scopes']}")
            else:
                logger.warning("No granted_scopes in token response")
                
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
        # Try with the original access token first, then long-lived token
        try:
            logger.info(f"Trying to get pages with original access token: {access_token[:20]}...")
            pages_data = instagram_graph_api.get_user_pages(access_token)
            logger.info(f"Got pages data with original token: {pages_data}")
        except Exception as e:
            logger.warning(f"Failed to get pages with original token: {str(e)}")
            logger.info(f"Trying with long-lived token: {long_lived_token[:20]}...")
            pages_data = instagram_graph_api.get_user_pages(long_lived_token)
            logger.info(f"Got pages data: {pages_data}")
            logger.info(f"Pages data type: {type(pages_data)}")
            logger.info(f"Pages data keys: {pages_data.keys() if isinstance(pages_data, dict) else 'Not a dict'}")
            if isinstance(pages_data, dict) and 'data' in pages_data:
                logger.info(f"Pages data array length: {len(pages_data['data']) if pages_data['data'] else 0}")
                if pages_data['data']:
                    logger.info(f"First page data: {pages_data['data'][0]}")
        except Exception as e:
            logger.error(f"Get pages failed: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Get pages failed: {str(e)}")
        
        if not pages_data.get('data'):
            logger.error("No Facebook pages found for user")
            logger.error(f"Full pages response: {pages_data}")
            
            # Check if it's an empty array vs no data key
            if pages_data.get('data') == []:
                logger.error("User has no accessible Facebook pages - this could mean:")
                logger.error("1. User is not an admin of any Facebook pages")
                logger.error("2. Facebook pages are in draft mode (not published)")
                logger.error("3. App doesn't have permission to access the pages")
                logger.error("4. User needs to grant page access during OAuth")
                
                raise HTTPException(
                    status_code=400, 
                    detail={
                        "error": "No accessible Facebook pages found",
                        "message": "You don't have access to any Facebook pages. This could be because:",
                        "possible_causes": [
                            "You're not an admin of any Facebook pages",
                            "Your Facebook pages are in draft mode (not published)",
                            "The app needs permission to access your pages",
                            "You need to grant page access during the connection process"
                        ],
                        "steps": [
                            "1. Make sure you're an admin of a Facebook page",
                            "2. Ensure your Facebook page is published (not draft)",
                            "3. During OAuth, grant access to your Facebook pages",
                            "4. Make sure your Instagram is connected to the Facebook page",
                            "5. Try connecting again"
                        ],
                        "help_url": "https://www.facebook.com/help/instagram/182333492962771"
                    }
                )
            else:
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
            
        # Try to get Instagram account directly from user
        ig_user_id = None
        page_id = None
        page_access_token = None
        
        # First, try to get Instagram account directly from user with original token
        try:
            logger.info("Trying to get Instagram account directly from user with original token...")
            user_ig_data = instagram_graph_api.get_user_instagram_account(access_token)
            if user_ig_data and user_ig_data.get('instagram_business_account'):
                ig_user_id = user_ig_data['instagram_business_account']['id']
                logger.info(f"Found Instagram account directly: {ig_user_id}")
            else:
                logger.info("No direct Instagram account found with original token, trying long-lived token...")
                try:
                    user_ig_data = instagram_graph_api.get_user_instagram_account(long_lived_token)
                    if user_ig_data and user_ig_data.get('instagram_business_account'):
                        ig_user_id = user_ig_data['instagram_business_account']['id']
                        logger.info(f"Found Instagram account with long-lived token: {ig_user_id}")
                    else:
                        logger.info("No direct Instagram account found, checking pages...")
                except Exception as e2:
                    logger.warning(f"Failed to get Instagram account with long-lived token: {str(e2)}")
        except Exception as e:
            logger.warning(f"Failed to get direct Instagram account: {str(e)}")
        
        # If no direct Instagram account, check pages
        if not ig_user_id:
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
        
        # Store session in memory and on disk
        session_data = {
            'access_token': page_access_token,
            'ig_user_id': ig_user_id,
            'username': ig_user_info.get('username'),
            'page_id': page_id,
            'followers_count': ig_user_info.get('followers_count', 0),
            'media_count': ig_user_info.get('media_count', 0),
            'account_type': 'BUSINESS'  # Graph API only works with business accounts
        }
        instagram_graph_sessions[ig_user_id] = session_data
        save_instagram_graph_session(ig_user_id, session_data)
        
        # Debug logging
        logger.info(f"Instagram Graph login successful for user: {ig_user_info.get('username')}")
        logger.info(f"[DEBUG] Stored session for user_id: {ig_user_id}")
        logger.info(f"[DEBUG] Total sessions now: {len(instagram_graph_sessions)}")
        logger.info(f"[DEBUG] Session keys: {list(instagram_graph_sessions.keys())}")
        
        # Return session and auth info for debugging
        return JSONResponse({
            "success": True,
            "data": {
                "user_id": ig_user_id,
                "username": ig_user_info.get('username'),
                "followers_count": ig_user_info.get('followers_count', 0),
                "media_count": ig_user_info.get('media_count', 0),
                "account_type": "BUSINESS"
            },
            "message": "Successfully connected to Instagram",
            "session_info": {
                "user_id": ig_user_id,
                "username": ig_user_info.get('username'),
                "page_id": page_id,
                "has_access_token": bool(page_access_token),
                "access_token_preview": f"{page_access_token[:20]}..." if page_access_token else None,
                "account_type": "BUSINESS",
                "followers": ig_user_info.get('followers_count', 0),
                "media_count": ig_user_info.get('media_count', 0)
            },
            "auth_info": {
                "instagram_user_id": ig_user_id,
                "page_id": page_id,
                "page_access_token_length": len(page_access_token) if page_access_token else 0,
                "session_stored": ig_user_id in instagram_graph_sessions,
                "total_active_sessions": len(instagram_graph_sessions)
            }
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
            remove_instagram_graph_session(user_id)
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
            video_file=file,
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


@app.get("/api/instagram/webhook")
async def instagram_webhook_verify(request: Request):
    """
    Verify Instagram webhook subscription for Meta API
    """
    try:
        # Get verification parameters
        hub_mode = request.query_params.get("hub.mode")
        hub_challenge = request.query_params.get("hub.challenge")
        hub_verify_token = request.query_params.get("hub.verify_token")
        
        # Verify the webhook
        if hub_mode == "subscribe" and hub_verify_token == "instagram_webhook_verify_2025":
            logger.info("Instagram webhook verification successful")
            return int(hub_challenge)
        else:
            logger.error(f"Instagram webhook verification failed: mode={hub_mode}, token={hub_verify_token}")
            raise HTTPException(status_code=403, detail="Verification failed")
            
    except Exception as e:
        logger.error(f"Instagram webhook verification error: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook verification error")


@app.post("/api/instagram/webhook")
async def instagram_webhook_receive(request: Request):
    """
    Receive Instagram webhook notifications for Meta API
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

@app.post("/api/instagram/graph/long-lived-token")
async def get_long_lived_token(request: dict):
    """
    Get long-lived access token from short-lived token
    """
    try:
        access_token = request.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Access token is required")
        
        instagram_graph_api = InstagramGraphAPI()
        long_lived_token = instagram_graph_api.get_long_lived_token(access_token)
        
        return JSONResponse({
            "success": True,
            "data": {
                "access_token": long_lived_token,
                "token_type": "Bearer",
                "expires_in": 5183944  # 60 days in seconds
            }
        })
    except Exception as e:
        logger.error(f"Long-lived token error: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

@app.post("/api/instagram/graph/pages")
async def get_facebook_pages(request: dict):
    """
    Get Facebook pages for the user
    """
    try:
        access_token = request.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Access token is required")
        
        instagram_graph_api = InstagramGraphAPI()
        pages_data = instagram_graph_api.get_user_pages(access_token)
        
        return JSONResponse({
            "success": True,
            "data": pages_data
        })
    except Exception as e:
        logger.error(f"Facebook pages error: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

@app.post("/api/instagram/graph/instagram-account")
async def get_instagram_account(request: dict):
    """
    Get Instagram Business account from Facebook page
    """
    try:
        page_id = request.get("page_id")
        page_access_token = request.get("page_access_token")
        
        if not page_id or not page_access_token:
            raise HTTPException(status_code=400, detail="Page ID and page access token are required")
        
        instagram_graph_api = InstagramGraphAPI()
        ig_data = instagram_graph_api.get_instagram_account(page_id, page_access_token)
        
        return JSONResponse({
            "success": True,
            "data": ig_data
        })
    except Exception as e:
        logger.error(f"Instagram account error: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

@app.get("/api/instagram/platform/auth-url")
async def instagram_platform_auth_url():
    """
    Get Instagram Platform OAuth authorization URL (direct Instagram auth, no Facebook pages required)
    """
    try:
        instagram_platform_api = InstagramPlatformAPI()
        auth_url = instagram_platform_api.get_auth_url()
        
        return JSONResponse({
            "success": True,
            "auth_url": auth_url
        })
    except Exception as e:
        logger.error(f"Instagram Platform auth URL error: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)

@app.post("/api/instagram/platform/login")
async def instagram_platform_login(request: dict):
    """
    Instagram Platform OAuth login (direct Instagram auth, no Facebook pages required)
    """
    try:
        code = request.get("code")
        if not code:
            raise HTTPException(status_code=400, detail="Authorization code is required")
        
        instagram_platform_api = InstagramPlatformAPI()
        
        # Exchange code for access token
        token_data = instagram_platform_api.exchange_code_for_token(code)
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received")
        
        # Get long-lived token
        long_lived_token = instagram_platform_api.get_long_lived_token(access_token)
        
        # Get user info
        user_info = instagram_platform_api.get_user_info(long_lived_token)
        
        return JSONResponse({
            "success": True,
            "data": {
                "access_token": long_lived_token,
                "user_id": user_info.get("id"),
                "username": user_info.get("username"),
                "account_type": "BUSINESS",  # Graph API only works with business accounts
                "followers_count": 0,  # Not available in basic scope
                "media_count": user_info.get("media_count", 0)
            }
        })
    except Exception as e:
        logger.error(f"Instagram Platform login error: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=500)


# Load existing sessions on startup
# Sessions are now stored in memory only - no persistence across restarts
# Users will need to reconnect after server restarts

# def load_existing_sessions():
#     """Load existing sessions from file on startup"""
#     try:
#         # Load Instagram (instagrapi) sessions
#         sessions = load_instagram_sessions()
#         logger.info(f"Found {len(sessions)} saved Instagram sessions")
#         
#         for username, session_data in sessions.items():
#             logger.info(f"Saved session for user: {username}")
#         
#         # Load Instagram Graph sessions
#         global instagram_graph_sessions
#         graph_sessions = load_instagram_graph_sessions()
#         instagram_graph_sessions = graph_sessions
#         logger.info(f"Loaded {len(graph_sessions)} Instagram Graph sessions")
#             
#     except Exception as e:
#         logger.error(f"Failed to load existing sessions: {e}")

# Load sessions on startup
# load_existing_sessions()

# Debug endpoints for production testing
@app.get("/api/debug/sessions")
async def debug_sessions():
    """
    Debug endpoint to check stored sessions
    """
    try:
        # Get sessions from memory (not disk)
        logger.info(f"[DEBUG] Checking instagram_graph_sessions in memory")
        logger.info(f"[DEBUG] Total sessions in memory: {len(instagram_graph_sessions)}")
        logger.info(f"[DEBUG] Session keys: {list(instagram_graph_sessions.keys())}")
        
        # Mask sensitive data
        safe_sessions = {}
        for user_id, session in instagram_graph_sessions.items():
            safe_sessions[user_id] = {
                'username': session.get('username'),
                'ig_user_id': session.get('ig_user_id'),
                'page_id': session.get('page_id'),
                'followers_count': session.get('followers_count'),
                'media_count': session.get('media_count'),
                'account_type': session.get('account_type'),
                'has_access_token': bool(session.get('access_token')),
                'access_token_preview': session.get('access_token', '')[:10] + '...' if session.get('access_token') else None
            }
        
        return JSONResponse({
            "success": True,
            "message": f"Found {len(instagram_graph_sessions)} Instagram Graph sessions in memory",
            "sessions": safe_sessions
        })
    except Exception as e:
        logger.error(f"Debug sessions error: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": "Failed to load sessions",
            "details": str(e)
        })

@app.get("/api/debug/sessions/full")
async def debug_sessions_full():
    """
    Debug endpoint to show full session data including access tokens
    WARNING: This exposes sensitive data - use only for debugging
    """
    try:
        logger.info(f"[DEBUG] Full session check - Total sessions: {len(instagram_graph_sessions)}")
        
        return JSONResponse({
            "success": True,
            "message": f"Found {len(instagram_graph_sessions)} Instagram Graph sessions in memory",
            "sessions": instagram_graph_sessions,
            "warning": "This endpoint exposes sensitive data - use only for debugging"
        })
    except Exception as e:
        logger.error(f"Debug sessions full error: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": "Failed to load sessions",
            "details": str(e)
        })

@app.get("/api/debug/instagram/status")
async def debug_instagram_status():
    """
    Debug endpoint to check Instagram Graph API status
    """
    try:
        # Test credentials
        if not instagram_graph_api.validate_credentials():
            return JSONResponse({
                "success": False,
                "error": "Instagram Graph API credentials not configured",
                "details": {
                    "app_id": instagram_graph_api.app_id,
                    "redirect_uri": instagram_graph_api.redirect_uri,
                    "scopes": instagram_graph_api.scopes
                }
            })
        
        # Test auth URL generation
        try:
            auth_url, state = instagram_graph_api.get_auth_url()
            return JSONResponse({
                "success": True,
                "message": "Instagram Graph API is properly configured",
                "details": {
                    "app_id": instagram_graph_api.app_id,
                    "redirect_uri": instagram_graph_api.redirect_uri,
                    "scopes": instagram_graph_api.scopes,
                    "auth_url": auth_url,
                    "state": state
                }
            })
        except Exception as e:
            return JSONResponse({
                "success": False,
                "error": "Failed to generate auth URL",
                "details": str(e)
            })
            
    except Exception as e:
        logger.error(f"Debug Instagram status error: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": "Debug check failed",
            "details": str(e)
        })

@app.post("/api/debug/instagram/test-token")
async def debug_test_token(request: dict):
    """
    Debug endpoint to test access token and get detailed info
    """
    try:
        access_token = request.get('access_token')
        if not access_token:
            return JSONResponse({
                "success": False,
                "error": "Access token required"
            })
        
        # Test access token validation
        try:
            user_info = instagram_graph_api.get_user_info(access_token)
            logger.info(f"Debug - User info: {user_info}")
        except Exception as e:
            return JSONResponse({
                "success": False,
                "error": "Access token validation failed",
                "details": str(e)
            })
        
        # Test Facebook Pages retrieval
        try:
            pages_data = instagram_graph_api.get_user_pages(access_token)
            pages = pages_data.get('data', [])
            
            # Check Instagram connections
            pages_with_instagram = []
            for page in pages:
                if page.get('instagram_business_account'):
                    pages_with_instagram.append({
                        'page_id': page.get('id'),
                        'page_name': page.get('name'),
                        'instagram_id': page['instagram_business_account'].get('id'),
                        'has_access_token': bool(page.get('access_token'))
                    })
            
            return JSONResponse({
                "success": True,
                "message": "Token test completed",
                "details": {
                    "user_info": user_info,
                    "total_pages": len(pages),
                    "pages_with_instagram": len(pages_with_instagram),
                    "pages": pages,
                    "instagram_connected_pages": pages_with_instagram
                }
            })
            
        except Exception as e:
            return JSONResponse({
                "success": False,
                "error": "Failed to get Facebook pages",
                "details": str(e)
            })
            
    except Exception as e:
        logger.error(f"Debug token test error: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": "Debug test failed",
            "details": str(e)
        })

@app.get("/api/debug/login-history")
async def debug_login_history():
    """
    Debug endpoint to check recent login attempts and session creation
    """
    try:
        # Get current session count
        session_count = len(instagram_graph_sessions)
        
        # Get session details
        sessions_detail = {}
        for user_id, session in instagram_graph_sessions.items():
            sessions_detail[user_id] = {
                'username': session.get('username'),
                'has_token': bool(session.get('access_token')),
                'token_preview': session.get('access_token', '')[:20] + '...' if session.get('access_token') else None
            }
        
        return JSONResponse({
            "success": True,
            "message": "Login history retrieved",
            "data": {
                "total_sessions": session_count,
                "sessions": sessions_detail,
                "session_keys": list(instagram_graph_sessions.keys()),
                "note": "This shows current in-memory sessions. Sessions are lost on server restart."
            }
        })
    except Exception as e:
        logger.error(f"Debug login history error: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": "Failed to get login history",
            "details": str(e)
        })

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
# Backend restart trigger - Sun Oct 26 10:49:19 EDT 2025
