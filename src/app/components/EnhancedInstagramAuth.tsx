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
}

interface FacebookAuthResponse {
  accessToken: string;
  userID: string;
  expiresIn: number;
  signedRequest: string;
}

const EnhancedInstagramAuth: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    userInfo: null,
    accessToken: null,
    longLivedToken: null
  });

  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Instagram Graph API configuration
  const INSTAGRAM_CONFIG = {
    appId: '717044718072411',
    redirectUri: 'https://cast-five.vercel.app/auth/instagram/enhanced-callback',
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

      // Load Facebook SDK
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
          
          console.log('[ENHANCED AUTH] Facebook SDK loaded');
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
        console.log('[ENHANCED AUTH] Login status check:', response);
        
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
        console.log('[ENHANCED AUTH] Facebook login response:', response);
        
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

  // Get long-lived token using our backend (secure approach)
  const getLongLivedToken = async (shortLivedToken: string): Promise<string> => {
    console.log('[ENHANCED AUTH] Getting long-lived token...');

    try {
      const response = await fetch('/api/instagram/graph/long-lived-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          access_token: shortLivedToken
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[ENHANCED AUTH] Long-lived token failed:', errorData);
        throw new Error(`Long-lived token failed: ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('[ENHANCED AUTH] Long-lived token successful:', data);
      return data.access_token;
    } catch (error) {
      console.error('[ENHANCED AUTH] Long-lived token error:', error);
      throw error;
    }
  };

  // Get user Instagram account info
  const getUserInstagramAccount = async (accessToken: string): Promise<UserInfo> => {
    // First try to get Instagram account directly from user
    const userUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/me`;
    const userParams = new URLSearchParams({
      fields: 'id,name,instagram_business_account',
      access_token: accessToken
    });

    console.log('[ENHANCED AUTH] Getting user Instagram account...');

    const userResponse = await fetch(`${userUrl}?${userParams.toString()}`);
    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      console.error('[ENHANCED AUTH] User account fetch failed:', errorData);
      throw new Error(`User account fetch failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const userData = await userResponse.json();
    console.log('[ENHANCED AUTH] User data:', userData);

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
        console.error('[ENHANCED AUTH] Instagram account fetch failed:', errorData);
        throw new Error(`Instagram account fetch failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const instagramData = await instagramResponse.json();
      console.log('[ENHANCED AUTH] Instagram account data:', instagramData);
      return instagramData;
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
      console.error('[ENHANCED AUTH] Pages fetch failed:', errorData);
      throw new Error(`Pages fetch failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const pagesData = await pagesResponse.json();
    console.log('[ENHANCED AUTH] Pages data:', pagesData);

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
          console.log('[ENHANCED AUTH] Found Instagram account via pages:', instagramData);
          return instagramData;
        }
      }
    }

    throw new Error('No Instagram Business account found');
  };

  // Handle authentication using Facebook SDK
  const handleAuth = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      if (!sdkLoaded) {
        throw new Error('Facebook SDK not loaded yet. Please wait...');
      }

      console.log('[ENHANCED AUTH] Starting Facebook SDK authentication...');
      
      // First check if already logged in
      const existingAuth = await checkLoginStatus();
      if (existingAuth) {
        console.log('[ENHANCED AUTH] Already logged in, using existing token');
        await handleAuthSuccess(existingAuth);
        return;
      }

      // Login with Facebook SDK
      const authResponse = await loginWithFacebookSDK();
      console.log('[ENHANCED AUTH] Facebook SDK login successful:', authResponse);
      
      await handleAuthSuccess(authResponse);

    } catch (error) {
      console.error('[ENHANCED AUTH] Auth error:', error);
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
      console.log('[ENHANCED AUTH] Processing auth response:', authResponse);
      
      // Step 1: Get long-lived token
      const longLivedToken = await getLongLivedToken(authResponse.accessToken);
      console.log('[ENHANCED AUTH] Long-lived token received:', longLivedToken);

      // Step 2: Get user Instagram account info
      const userInfo = await getUserInstagramAccount(longLivedToken);
      console.log('[ENHANCED AUTH] User info received:', userInfo);

      // Update state
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userInfo: userInfo,
        accessToken: authResponse.accessToken,
        longLivedToken: longLivedToken
      });

      // Store session info
      const sessionInfo = {
        user_id: userInfo.id,
        username: userInfo.username,
        account_type: userInfo.account_type,
        short_lived_token: authResponse.accessToken,
        long_lived_token: longLivedToken,
        expires_at: Date.now() + (60 * 24 * 60 * 60 * 1000), // 60 days
        facebook_user_id: authResponse.userID,
        token_expires_in: authResponse.expiresIn
      };

      setDebugInfo(sessionInfo);
      console.log('[ENHANCED AUTH] Session created:', sessionInfo);

    } catch (error) {
      console.error('[ENHANCED AUTH] Auth success processing error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication processing failed'
      }));
    }
  };

  // Test posting functionality
  const testPosting = async () => {
    if (!authState.longLivedToken || !authState.userInfo) {
      setAuthState(prev => ({ ...prev, error: 'Not authenticated' }));
      return;
    }

    try {
      console.log('[ENHANCED AUTH] Testing posting functionality...');
      
      // Test with a simple text post (this would be a story or reel in practice)
      const testUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${authState.userInfo.id}/media`;
      
      const testData = {
        image_url: 'https://via.placeholder.com/1080x1920/FF6B6B/FFFFFF?text=Enhanced+Test+Post',
        caption: 'Test post from enhanced Instagram component using Facebook SDK!',
        access_token: authState.longLivedToken
      };

      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[ENHANCED AUTH] Posting test failed:', errorData);
        throw new Error(`Posting test failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('[ENHANCED AUTH] Posting test successful:', result);
      
      setAuthState(prev => ({
        ...prev,
        error: null
      }));

      alert('Enhanced posting test successful! Check your Instagram account.');

    } catch (error) {
      console.error('[ENHANCED AUTH] Posting test error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Posting test failed'
      }));
    }
  };

  // Logout using Facebook SDK
  const handleLogout = () => {
    if (window.FB) {
      window.FB.logout(() => {
        console.log('[ENHANCED AUTH] Facebook SDK logout completed');
      });
    }
    
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userInfo: null,
      accessToken: null,
      longLivedToken: null
    });
    setDebugInfo(null);
    console.log('[ENHANCED AUTH] Logged out');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Enhanced Instagram Authentication
        </h2>
        <p className="text-gray-600">
          Using Facebook SDK for JavaScript with automatic token management
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
          <h3 className="text-lg font-semibold mb-2 text-green-800">User Information</h3>
          <div className="space-y-1 text-sm">
            <div><strong>ID:</strong> {authState.userInfo.id}</div>
            <div><strong>Username:</strong> {authState.userInfo.username}</div>
            <div><strong>Account Type:</strong> {authState.userInfo.account_type}</div>
            {authState.accessToken && (
                <div><strong>Facebook User ID:</strong> {String(debugInfo?.facebook_user_id || '')}</div>
            )}
          </div>
        </div>
      )}

      {/* Debug Info */}
      {debugInfo && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold mb-2 text-blue-800">Session Information</h3>
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
            {authState.isLoading ? 'Authenticating...' : 'Connect with Facebook SDK'}
          </button>
        ) : (
          <div className="space-y-2">
            <button
              onClick={testPosting}
              className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 transition-colors duration-200"
            >
              Test Posting Functionality
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
          <div><strong>Method:</strong> Facebook SDK for JavaScript</div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedInstagramAuth;
