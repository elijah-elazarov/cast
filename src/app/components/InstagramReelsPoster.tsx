'use client';

import React, { useState, useEffect } from 'react';

// Facebook SDK types
interface FacebookAuthResponse {
  accessToken: string;
  userID: string;
  expiresIn: number;
  signedRequest: string;
}

interface FacebookLoginResponse {
  authResponse: FacebookAuthResponse;
  status: string;
}

declare global {
  interface Window {
    FB: {
      init: (config: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      getLoginStatus: (callback: (response: FacebookLoginResponse) => void) => void;
      login: (callback: (response: FacebookLoginResponse) => void, options: { scope: string; return_scopes: boolean }) => void;
      logout: (callback: () => void) => void;
    };
    fbAsyncInit: () => void;
  }
}

interface UserInfo {
  id: string;
  username: string;
  account_type: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userInfo: UserInfo | null;
  accessToken: string | null;
  longLivedToken: string | null;
  instagramPageId: string | null;
}

interface ReelPostData {
  videoUrl: string;
  caption: string;
  thumbnailUrl?: string;
}

interface PostingState {
  isPosting: boolean;
  step: 'idle' | 'creating' | 'waiting' | 'publishing' | 'complete' | 'error';
  containerId: string | null;
  error: string | null;
  progress: number;
}

const InstagramReelsPoster: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    userInfo: null,
    accessToken: null,
    longLivedToken: null,
    instagramPageId: null
  });

  const [postingState, setPostingState] = useState<PostingState>({
    isPosting: false,
    step: 'idle',
    containerId: null,
    error: null,
    progress: 0
  });

  const [reelData, setReelData] = useState<ReelPostData>({
    videoUrl: '',
    caption: '',
    thumbnailUrl: ''
  });

  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Instagram Graph API configuration
  const INSTAGRAM_CONFIG = {
    appId: '717044718072411',
    scope: 'instagram_basic,pages_show_list,pages_read_engagement,business_management,instagram_content_publish,instagram_manage_comments,instagram_manage_insights',
    apiVersion: 'v21.0'
  };

  // Load Facebook SDK
  useEffect(() => {
    const loadFacebookSDK = () => {
      if (window.FB) {
        setSdkLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        window.fbAsyncInit = () => {
          window.FB.init({
            appId: INSTAGRAM_CONFIG.appId,
            cookie: true,
            xfbml: true,
            version: INSTAGRAM_CONFIG.apiVersion
          });
          
          console.log('[REELS POSTER] Facebook SDK loaded');
          setSdkLoaded(true);
        };
      };

      document.head.appendChild(script);
    };

    loadFacebookSDK();
  }, [INSTAGRAM_CONFIG.apiVersion, INSTAGRAM_CONFIG.appId]);

  // Check login status using Facebook SDK
  const checkLoginStatus = (): Promise<FacebookAuthResponse | null> => {
    return new Promise((resolve) => {
      if (!window.FB) {
        resolve(null);
        return;
      }

      window.FB.getLoginStatus((response: FacebookLoginResponse) => {
        console.log('[REELS POSTER] Login status check:', response);
        
        if (response.status === 'connected') {
          resolve(response.authResponse);
        } else {
          resolve(null);
        }
      });
    });
  };

  // Login using Facebook SDK
  const loginWithFacebookSDK = (): Promise<FacebookAuthResponse> => {
    return new Promise((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK not loaded'));
        return;
      }

      window.FB.login((response: FacebookLoginResponse) => {
        console.log('[REELS POSTER] Facebook login response:', response);
        
        if (response.authResponse) {
          resolve(response.authResponse);
        } else {
          reject(new Error('Login failed or cancelled'));
        }
      }, {
        scope: INSTAGRAM_CONFIG.scope,
        return_scopes: true
      });
    });
  };

  // Get long-lived token
  const getLongLivedToken = async (shortLivedToken: string): Promise<string> => {
    const url = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/oauth/access_token`;
    
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: INSTAGRAM_CONFIG.appId,
      client_secret: process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_SECRET || '',
      fb_exchange_token: shortLivedToken
    });

    console.log('[REELS POSTER] Getting long-lived token...');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[REELS POSTER] Long-lived token failed:', errorData);
      throw new Error(`Long-lived token failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const tokenData = await response.json();
    console.log('[REELS POSTER] Long-lived token successful:', tokenData);
    return tokenData.access_token;
  };

  // Get Instagram Business Account and Page ID
  const getInstagramAccount = async (accessToken: string): Promise<{userInfo: UserInfo, pageId: string}> => {
    // First try to get Instagram account directly from user
    const userUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/me`;
    const userParams = new URLSearchParams({
      fields: 'id,name,instagram_business_account',
      access_token: accessToken
    });

    console.log('[REELS POSTER] Getting user Instagram account...');

    const userResponse = await fetch(`${userUrl}?${userParams.toString()}`);
    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      console.error('[REELS POSTER] User account fetch failed:', errorData);
      throw new Error(`User account fetch failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const userData = await userResponse.json();
    console.log('[REELS POSTER] User data:', userData);

    if (userData.instagram_business_account) {
      // Get Instagram account details
      const instagramId = userData.instagram_business_account.id;
      const instagramUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${instagramId}`;
      const instagramParams = new URLSearchParams({
        fields: 'id,username,account_type',
        access_token: accessToken
      });

      const instagramResponse = await fetch(`${instagramUrl}?${instagramParams.toString()}`);
      if (!instagramResponse.ok) {
        const errorData = await instagramResponse.json();
        console.error('[REELS POSTER] Instagram account fetch failed:', errorData);
        throw new Error(`Instagram account fetch failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const instagramData = await instagramResponse.json();
      console.log('[REELS POSTER] Instagram account data:', instagramData);
      
      return { userInfo: instagramData, pageId: instagramId };
    }

    // Fallback: try to get from pages
    const pagesUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/me/accounts`;
    const pagesParams = new URLSearchParams({
      fields: 'id,name,instagram_business_account',
      access_token: accessToken
    });

    const pagesResponse = await fetch(`${pagesUrl}?${pagesParams.toString()}`);
    if (!pagesResponse.ok) {
      const errorData = await pagesResponse.json();
      console.error('[REELS POSTER] Pages fetch failed:', errorData);
      throw new Error(`Pages fetch failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const pagesData = await pagesResponse.json();
    console.log('[REELS POSTER] Pages data:', pagesData);

    for (const page of pagesData.data) {
      if (page.instagram_business_account) {
        const instagramId = page.instagram_business_account.id;
        const instagramUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${instagramId}`;
        const instagramParams = new URLSearchParams({
          fields: 'id,username,account_type',
          access_token: accessToken
        });

        const instagramResponse = await fetch(`${instagramUrl}?${instagramParams.toString()}`);
        if (instagramResponse.ok) {
          const instagramData = await instagramResponse.json();
          console.log('[REELS POSTER] Found Instagram account via pages:', instagramData);
          return { userInfo: instagramData, pageId: instagramId };
        }
      }
    }

    throw new Error('No Instagram Business account found');
  };

  // Handle authentication
  const handleAuth = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      if (!sdkLoaded) {
        throw new Error('Facebook SDK not loaded yet. Please wait...');
      }

      console.log('[REELS POSTER] Starting Facebook SDK authentication...');
      
      // First check if already logged in
      const existingAuth = await checkLoginStatus();
      if (existingAuth) {
        console.log('[REELS POSTER] Already logged in, using existing token');
        await handleAuthSuccess(existingAuth);
        return;
      }

      // Login with Facebook SDK
      const authResponse = await loginWithFacebookSDK();
      console.log('[REELS POSTER] Facebook SDK login successful:', authResponse);
      
      await handleAuthSuccess(authResponse);

    } catch (error) {
      console.error('[REELS POSTER] Auth error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      }));
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = async (authResponse: FacebookAuthResponse) => {
    try {
      console.log('[REELS POSTER] Processing auth response:', authResponse);
      
      // Step 1: Get long-lived token
      const longLivedToken = await getLongLivedToken(authResponse.accessToken);
      console.log('[REELS POSTER] Long-lived token received:', longLivedToken);

      // Step 2: Get Instagram account and page ID
      const { userInfo, pageId } = await getInstagramAccount(longLivedToken);
      console.log('[REELS POSTER] Instagram account and page ID received:', { userInfo, pageId });

      // Update state
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userInfo: userInfo,
        accessToken: authResponse.accessToken,
        longLivedToken: longLivedToken,
        instagramPageId: pageId
      });

      // Store session info
      const sessionInfo = {
        user_id: userInfo.id,
        username: userInfo.username,
        account_type: userInfo.account_type,
        instagram_page_id: pageId,
        short_lived_token: authResponse.accessToken,
        long_lived_token: longLivedToken,
        expires_at: Date.now() + (60 * 24 * 60 * 60 * 1000), // 60 days
        facebook_user_id: authResponse.userID,
        token_expires_in: authResponse.expiresIn
      };

      setDebugInfo(sessionInfo);
      console.log('[REELS POSTER] Session created:', sessionInfo);

    } catch (error) {
      console.error('[REELS POSTER] Auth success processing error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication processing failed'
      }));
    }
  };

  // Step 1: Create Reel Container
  const createReelContainer = async (): Promise<string> => {
    if (!authState.longLivedToken || !authState.instagramPageId) {
      throw new Error('Not authenticated or missing Instagram page ID');
    }

    const url = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${authState.instagramPageId}/media`;
    
    const requestData: Record<string, string | number> = {
      video_url: reelData.videoUrl,
      caption: reelData.caption,
      access_token: authState.longLivedToken
    };

    // Add thumbnail if provided
    if (reelData.thumbnailUrl) {
      requestData.thumb_offset = 0; // Use first frame as thumbnail
    }

    console.log('[REELS POSTER] Creating reel container...', requestData);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[REELS POSTER] Container creation failed:', errorData);
      throw new Error(`Container creation failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('[REELS POSTER] Container created:', result);
    
    if (!result.id) {
      throw new Error('No container ID returned');
    }

    return result.id;
  };

  // Step 2: Check Container Status
  const checkContainerStatus = async (containerId: string): Promise<string> => {
    if (!authState.longLivedToken) {
      throw new Error('Not authenticated');
    }

    const url = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${containerId}`;
    const params = new URLSearchParams({
      fields: 'status_code',
      access_token: authState.longLivedToken
    });

    console.log('[REELS POSTER] Checking container status...');

    const response = await fetch(`${url}?${params.toString()}`);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[REELS POSTER] Status check failed:', errorData);
      throw new Error(`Status check failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('[REELS POSTER] Container status:', result);
    
    return result.status_code;
  };

  // Step 3: Publish Reel
  const publishReel = async (containerId: string): Promise<Record<string, unknown>> => {
    if (!authState.longLivedToken || !authState.instagramPageId) {
      throw new Error('Not authenticated or missing Instagram page ID');
    }

    const url = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${authState.instagramPageId}/media_publish`;
    
    const requestData = {
      creation_id: containerId,
      access_token: authState.longLivedToken
    };

    console.log('[REELS POSTER] Publishing reel...', requestData);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[REELS POSTER] Publishing failed:', errorData);
      throw new Error(`Publishing failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('[REELS POSTER] Reel published:', result);
    
    return result;
  };

  // Complete Reels Posting Flow
  const postReel = async () => {
    if (!reelData.videoUrl || !reelData.caption) {
      setPostingState(prev => ({ ...prev, error: 'Please provide video URL and caption' }));
      return;
    }

    setPostingState({
      isPosting: true,
      step: 'creating',
      containerId: null,
      error: null,
      progress: 0
    });

    try {
      // Step 1: Create Container
      setPostingState(prev => ({ ...prev, step: 'creating', progress: 20 }));
      const containerId = await createReelContainer();
      
      setPostingState(prev => ({ 
        ...prev, 
        step: 'waiting', 
        containerId, 
        progress: 40 
      }));

      // Step 2: Wait for Processing
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes max
      
      while (attempts < maxAttempts) {
        const status = await checkContainerStatus(containerId);
        
        if (status === 'FINISHED') {
          console.log('[REELS POSTER] Container processing finished');
          break;
        } else if (status === 'ERROR') {
          throw new Error('Container processing failed');
        }
        
        // Wait 10 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
        
        setPostingState(prev => ({ 
          ...prev, 
          progress: Math.min(40 + (attempts * 2), 80) 
        }));
      }

      if (attempts >= maxAttempts) {
        throw new Error('Container processing timeout');
      }

      // Step 3: Publish
      setPostingState(prev => ({ ...prev, step: 'publishing', progress: 90 }));
      const publishResult = await publishReel(containerId);
      
      setPostingState({
        isPosting: false,
        step: 'complete',
        containerId,
        error: null,
        progress: 100
      });

      console.log('[REELS POSTER] Reel posted successfully:', publishResult);
      alert('Reel posted successfully! Check your Instagram account.');

    } catch (error) {
      console.error('[REELS POSTER] Posting error:', error);
      setPostingState(prev => ({
        ...prev,
        isPosting: false,
        step: 'error',
        error: error instanceof Error ? error.message : 'Posting failed'
      }));
    }
  };

  // Logout
  const handleLogout = () => {
    if (window.FB) {
      window.FB.logout(() => {
        console.log('[REELS POSTER] Facebook SDK logout completed');
      });
    }
    
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userInfo: null,
      accessToken: null,
      longLivedToken: null,
      instagramPageId: null
    });
    setDebugInfo(null);
    setPostingState({
      isPosting: false,
      step: 'idle',
      containerId: null,
      error: null,
      progress: 0
    });
    console.log('[REELS POSTER] Logged out');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Instagram Reels Poster
        </h2>
        <p className="text-gray-600">
          App-authenticated posting for Instagram Reels using Facebook SDK
        </p>
      </div>

      {/* SDK Status */}
      <div className="mb-6 p-4 rounded-lg border">
        <h3 className="text-lg font-semibold mb-2">Facebook SDK Status</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${sdkLoaded ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm">
              {sdkLoaded ? 'Facebook SDK Loaded' : 'Loading Facebook SDK...'}
            </span>
          </div>
        </div>
      </div>

      {/* Authentication Status */}
      <div className="mb-6 p-4 rounded-lg border">
        <h3 className="text-lg font-semibold mb-2">Authentication Status</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${authState.isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm">
              {authState.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </span>
          </div>
          {authState.isLoading && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
              <span className="text-sm">Loading...</span>
            </div>
          )}
          {authState.error && (
            <div className="text-red-600 text-sm">
              Error: {authState.error}
            </div>
          )}
        </div>
      </div>

      {/* User Info */}
      {authState.userInfo && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold mb-2 text-green-800">Instagram Account</h3>
          <div className="space-y-1 text-sm">
            <div><strong>ID:</strong> {authState.userInfo.id}</div>
            <div><strong>Username:</strong> {authState.userInfo.username}</div>
            <div><strong>Account Type:</strong> {authState.userInfo.account_type}</div>
            <div><strong>Page ID:</strong> {authState.instagramPageId}</div>
          </div>
        </div>
      )}

      {/* Reel Posting Form */}
      {authState.isAuthenticated && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold mb-4 text-blue-800">Post Reel</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video URL *
              </label>
              <input
                type="url"
                value={reelData.videoUrl}
                onChange={(e) => setReelData(prev => ({ ...prev, videoUrl: e.target.value }))}
                placeholder="https://example.com/video.mp4"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Caption *
              </label>
              <textarea
                value={reelData.caption}
                onChange={(e) => setReelData(prev => ({ ...prev, caption: e.target.value }))}
                placeholder="Your reel caption..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thumbnail URL (optional)
              </label>
              <input
                type="url"
                value={reelData.thumbnailUrl}
                onChange={(e) => setReelData(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                placeholder="https://example.com/thumbnail.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Posting Status */}
      {postingState.step !== 'idle' && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="text-lg font-semibold mb-2 text-yellow-800">Posting Status</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                postingState.step === 'complete' ? 'bg-green-500' :
                postingState.step === 'error' ? 'bg-red-500' :
                'bg-yellow-500 animate-pulse'
              }`}></div>
              <span className="text-sm">
                {postingState.step === 'creating' && 'Creating container...'}
                {postingState.step === 'waiting' && 'Processing video...'}
                {postingState.step === 'publishing' && 'Publishing reel...'}
                {postingState.step === 'complete' && 'Reel posted successfully!'}
                {postingState.step === 'error' && 'Posting failed'}
              </span>
            </div>
            
            {postingState.progress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${postingState.progress}%` }}
                ></div>
              </div>
            )}
            
            {postingState.containerId && (
              <div className="text-xs text-gray-600">
                Container ID: {postingState.containerId}
              </div>
            )}
            
            {postingState.error && (
              <div className="text-red-600 text-sm">
                Error: {postingState.error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Debug Info */}
      {debugInfo && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Session Information</h3>
          <pre className="text-xs bg-white p-2 rounded border overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-4">
        {!authState.isAuthenticated ? (
          <button
            onClick={handleAuth}
            disabled={authState.isLoading || !sdkLoaded}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {authState.isLoading ? 'Authenticating...' : 'Connect Instagram Account'}
          </button>
        ) : (
          <div className="space-y-2">
            <button
              onClick={postReel}
              disabled={postingState.isPosting || !reelData.videoUrl || !reelData.caption}
              className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {postingState.isPosting ? 'Posting Reel...' : 'Post Reel'}
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-gray-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Configuration Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <h3 className="text-lg font-semibold mb-2">Configuration</h3>
        <div className="text-sm space-y-1">
          <div><strong>App ID:</strong> {INSTAGRAM_CONFIG.appId}</div>
          <div><strong>API Version:</strong> {INSTAGRAM_CONFIG.apiVersion}</div>
          <div><strong>Scopes:</strong> {INSTAGRAM_CONFIG.scope}</div>
          <div><strong>Method:</strong> Facebook SDK + Instagram Graph API</div>
          <div><strong>Purpose:</strong> App-authenticated Reels posting</div>
        </div>
      </div>
    </div>
  );
};

export default InstagramReelsPoster;
