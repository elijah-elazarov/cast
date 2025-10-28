'use client';

import React, { useState } from 'react';

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
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface UserInfo {
  id: string;
  username: string;
  account_type: string;
}

const FreshInstagramAuth: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    userInfo: null,
    accessToken: null
  });

  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);

  // Instagram Graph API configuration
  const INSTAGRAM_CONFIG = {
    clientId: '717044718072411',
    redirectUri: 'https://cast-five.vercel.app/auth/instagram/fresh-callback',
    scope: 'instagram_basic,pages_show_list,pages_read_engagement,business_management,instagram_content_publish,instagram_manage_comments,instagram_manage_insights',
    apiVersion: 'v21.0'
  };

  // Generate auth URL
  const generateAuthUrl = (): string => {
    const state = Math.random().toString(36).substring(2, 15);
    const params = new URLSearchParams({
      client_id: INSTAGRAM_CONFIG.clientId,
      redirect_uri: INSTAGRAM_CONFIG.redirectUri,
      scope: INSTAGRAM_CONFIG.scope,
      response_type: 'code',
      state: state,
      auth_type: 'rerequest'
    });

    return `https://www.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/dialog/oauth?${params.toString()}`;
  };

  // Exchange code for access token
  const exchangeCodeForToken = async (code: string): Promise<TokenResponse> => {
    const tokenUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/oauth/access_token`;
    
    const params = new URLSearchParams({
      client_id: INSTAGRAM_CONFIG.clientId,
      client_secret: process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_SECRET || '',
      redirect_uri: INSTAGRAM_CONFIG.redirectUri,
      code: code,
      grant_type: 'authorization_code'
    });

    console.log('[FRESH AUTH] Exchanging code for token...');
    console.log('[FRESH AUTH] Token URL:', tokenUrl);
    console.log('[FRESH AUTH] Code:', code.substring(0, 10) + '...');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[FRESH AUTH] Token exchange failed:', errorData);
      throw new Error(`Token exchange failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const tokenData = await response.json();
    console.log('[FRESH AUTH] Token exchange successful:', tokenData);
    return tokenData;
  };

  // Get long-lived token
  const getLongLivedToken = async (shortLivedToken: string): Promise<string> => {
    const url = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/oauth/access_token`;
    
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: INSTAGRAM_CONFIG.clientId,
      client_secret: process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_SECRET || '',
      fb_exchange_token: shortLivedToken
    });

    console.log('[FRESH AUTH] Getting long-lived token...');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[FRESH AUTH] Long-lived token failed:', errorData);
      throw new Error(`Long-lived token failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const tokenData = await response.json();
    console.log('[FRESH AUTH] Long-lived token successful:', tokenData);
    return tokenData.access_token;
  };

  // Get user Instagram account info
  const getUserInstagramAccount = async (accessToken: string): Promise<UserInfo> => {
    // First try to get Instagram account directly from user
    const userUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/me`;
    const userParams = new URLSearchParams({
      fields: 'id,name,instagram_business_account',
      access_token: accessToken
    });

    console.log('[FRESH AUTH] Getting user Instagram account...');

    const userResponse = await fetch(`${userUrl}?${userParams.toString()}`);
    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      console.error('[FRESH AUTH] User account fetch failed:', errorData);
      throw new Error(`User account fetch failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const userData = await userResponse.json();
    console.log('[FRESH AUTH] User data:', userData);

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
        console.error('[FRESH AUTH] Instagram account fetch failed:', errorData);
        throw new Error(`Instagram account fetch failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const instagramData = await instagramResponse.json();
      console.log('[FRESH AUTH] Instagram account data:', instagramData);
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
      console.error('[FRESH AUTH] Pages fetch failed:', errorData);
      throw new Error(`Pages fetch failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const pagesData = await pagesResponse.json();
    console.log('[FRESH AUTH] Pages data:', pagesData);

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
          console.log('[FRESH AUTH] Found Instagram account via pages:', instagramData);
          return instagramData;
        }
      }
    }

    throw new Error('No Instagram Business account found');
  };

  // Handle authentication
  const handleAuth = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const authUrl = generateAuthUrl();
      console.log('[FRESH AUTH] Generated auth URL:', authUrl);
      
      // Open popup window
      const popup = window.open(
        authUrl,
        'instagram-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for popup messages
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'INSTAGRAM_AUTH_SUCCESS') {
          console.log('[FRESH AUTH] Received auth success:', event.data);
          handleAuthSuccess(event.data.code);
          popup.close();
          window.removeEventListener('message', messageHandler);
        } else if (event.data.type === 'INSTAGRAM_AUTH_ERROR') {
          console.error('[FRESH AUTH] Received auth error:', event.data);
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: event.data.error
          }));
          popup.close();
          window.removeEventListener('message', messageHandler);
        }
      };

      window.addEventListener('message', messageHandler);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }, 1000);

    } catch (error) {
      console.error('[FRESH AUTH] Auth error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      }));
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = async (code: string) => {
    try {
      console.log('[FRESH AUTH] Processing auth code:', code);
      
      // Step 1: Exchange code for short-lived token
      const tokenData = await exchangeCodeForToken(code);
      console.log('[FRESH AUTH] Short-lived token received:', tokenData);

      // Step 2: Get long-lived token
      const longLivedToken = await getLongLivedToken(tokenData.access_token);
      console.log('[FRESH AUTH] Long-lived token received:', longLivedToken);

      // Step 3: Get user Instagram account info
      const userInfo = await getUserInstagramAccount(longLivedToken);
      console.log('[FRESH AUTH] User info received:', userInfo);

      // Update state
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userInfo: userInfo,
        accessToken: longLivedToken
      });

      // Store session info
      const sessionInfo = {
        user_id: userInfo.id,
        username: userInfo.username,
        account_type: userInfo.account_type,
        access_token: longLivedToken,
        expires_at: Date.now() + (60 * 24 * 60 * 60 * 1000) // 60 days
      };

      setDebugInfo(sessionInfo);
      console.log('[FRESH AUTH] Session created:', sessionInfo);

    } catch (error) {
      console.error('[FRESH AUTH] Auth success processing error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication processing failed'
      }));
    }
  };

  // Test posting functionality
  const testPosting = async () => {
    if (!authState.accessToken || !authState.userInfo) {
      setAuthState(prev => ({ ...prev, error: 'Not authenticated' }));
      return;
    }

    try {
      console.log('[FRESH AUTH] Testing posting functionality...');
      
      // Test with a simple text post (this would be a story or reel in practice)
      const testUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${authState.userInfo.id}/media`;
      
      const testData = {
        image_url: 'https://via.placeholder.com/1080x1920/FF6B6B/FFFFFF?text=Test+Post',
        caption: 'Test post from fresh Instagram component!',
        access_token: authState.accessToken
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
        console.error('[FRESH AUTH] Posting test failed:', errorData);
        throw new Error(`Posting test failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('[FRESH AUTH] Posting test successful:', result);
      
      setAuthState(prev => ({
        ...prev,
        error: null
      }));

      alert('Posting test successful! Check your Instagram account.');

    } catch (error) {
      console.error('[FRESH AUTH] Posting test error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Posting test failed'
      }));
    }
  };

  // Logout
  const handleLogout = () => {
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userInfo: null,
      accessToken: null
    });
    setDebugInfo(null);
    console.log('[FRESH AUTH] Logged out');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Fresh Instagram Authentication
        </h2>
        <p className="text-gray-600">
            Brand new Instagram component built from scratch using Facebook&apos;s manual OAuth flow
        </p>
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
            disabled={authState.isLoading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {authState.isLoading ? 'Authenticating...' : 'Connect Instagram Account'}
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
          <div><strong>Client ID:</strong> {INSTAGRAM_CONFIG.clientId}</div>
          <div><strong>Redirect URI:</strong> {INSTAGRAM_CONFIG.redirectUri}</div>
          <div><strong>API Version:</strong> {INSTAGRAM_CONFIG.apiVersion}</div>
          <div><strong>Scopes:</strong> {INSTAGRAM_CONFIG.scope}</div>
        </div>
      </div>
    </div>
  );
};

export default FreshInstagramAuth;
