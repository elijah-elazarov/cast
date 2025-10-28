'use client';

import { useState, useEffect } from 'react';

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
  longLivedToken: string | null;
  instagramPageId: string | null;
  facebookUserId: string | null;
}

interface FacebookAuthResponse {
  userID: string;
  accessToken: string;
  expiresIn: number;
  signedRequest: string;
  graphDomain: string;
  data_access_expiration_time: number;
  grantedScopes: string;
}

interface FacebookLoginResponse {
  authResponse: FacebookAuthResponse | null;
  status: string;
}

// Instagram Graph API configuration
const INSTAGRAM_CONFIG = {
  appId: '717044718072411',
  scope: 'instagram_basic,pages_show_list,pages_read_engagement,business_management,instagram_content_publish,instagram_manage_comments,instagram_manage_insights',
  apiVersion: 'v21.0'
};

// Facebook SDK interfaces for this component
interface DebugFacebookSDK {
  init: (config: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
  getLoginStatus: (callback: (response: DebugFacebookLoginResponse) => void) => void;
  login: (callback: (response: DebugFacebookLoginResponse) => void, options: { scope: string; return_scopes: boolean }) => void;
  logout: (callback: () => void) => void;
}

interface DebugFacebookLoginResponse {
  authResponse: FacebookAuthResponse | null;
  status: string;
}

// Window with Facebook SDK
interface WindowWithFB extends Window {
  FB: DebugFacebookSDK;
  fbAsyncInit: () => void;
}

export default function InstagramReelsDebugger() {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    userInfo: null,
    longLivedToken: null,
    instagramPageId: null,
    facebookUserId: null
  });
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[REELS DEBUG] ${message}`);
  };

  // Load Facebook SDK
  useEffect(() => {
    const loadFacebookSDK = () => {
      if ((window as WindowWithFB).FB) {
        setSdkLoaded(true);
        addLog('Facebook SDK already loaded');
        return;
      }

      addLog('Loading Facebook SDK...');
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        (window as WindowWithFB).fbAsyncInit = () => {
          (window as WindowWithFB).FB.init({
            appId: INSTAGRAM_CONFIG.appId,
            cookie: true,
            xfbml: true,
            version: INSTAGRAM_CONFIG.apiVersion
          });
          
          addLog('Facebook SDK loaded successfully');
          setSdkLoaded(true);
        };
      };
      
      document.head.appendChild(script);
    };

    loadFacebookSDK();
  }, []);

  // Check login status using Facebook SDK
  const checkLoginStatus = (): Promise<FacebookAuthResponse | null> => {
    return new Promise((resolve) => {
      if (!(window as WindowWithFB).FB) {
        addLog('Facebook SDK not loaded');
        resolve(null);
        return;
      }

      (window as WindowWithFB).FB.getLoginStatus((response: DebugFacebookLoginResponse) => {
        addLog(`Login status check: ${response.status}`);
        
        if (response.status === 'connected') {
          addLog(`Already logged in with user ID: ${response.authResponse?.userID}`);
          resolve(response.authResponse || null);
        } else {
          addLog('Not logged in');
          resolve(null);
        }
      });
    });
  };

  // Login using Facebook SDK
  const loginWithFacebookSDK = (): Promise<FacebookAuthResponse> => {
    return new Promise((resolve, reject) => {
      if (!(window as WindowWithFB).FB) {
        reject(new Error('Facebook SDK not loaded'));
        return;
      }

      addLog('Starting Facebook SDK login...');
      (window as WindowWithFB).FB.login((response: DebugFacebookLoginResponse) => {
        addLog(`Facebook login response: ${response.status}`);
        
        if (response.authResponse) {
          addLog(`Login successful for user: ${response.authResponse.userID}`);
          resolve(response.authResponse);
        } else {
          addLog('Login failed or cancelled');
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
    addLog('Getting long-lived token from backend...');

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
        addLog(`Long-lived token failed: ${JSON.stringify(errorData)}`);
        throw new Error(`Long-lived token failed: ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      addLog(`Long-lived token successful: ${data.success}`);
      addLog(`Token expires in: ${data.data.expires_in} seconds`);
      return data.data.access_token;
    } catch (error) {
      addLog(`Long-lived token error: ${error}`);
      throw error;
    }
  };

  // Get Instagram Business Account and Page ID
  const getInstagramAccount = async (accessToken: string): Promise<{userInfo: UserInfo, pageId: string}> => {
    addLog('Getting Instagram Business Account from Facebook Pages...');

    // Get Instagram account from Facebook Pages (correct approach)
    const pagesUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/me/accounts`;
    const pagesParams = new URLSearchParams({
      fields: 'id,name,instagram_business_account',
      access_token: accessToken
    });

    const pagesResponse = await fetch(`${pagesUrl}?${pagesParams.toString()}`);
    if (!pagesResponse.ok) {
      const errorData = await pagesResponse.json();
      addLog(`Pages fetch failed: ${JSON.stringify(errorData)}`);
      throw new Error(`Pages fetch failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const pagesData = await pagesResponse.json();
    addLog(`Found ${pagesData.data.length} Facebook Pages`);

    for (const page of pagesData.data) {
      addLog(`Checking page: ${page.name} (${page.id})`);
      
      if (page.instagram_business_account) {
        const instagramId = page.instagram_business_account.id;
        addLog(`Found Instagram Business Account: ${instagramId}`);
        
        const instagramUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${instagramId}`;
        const instagramParams = new URLSearchParams({
          fields: 'id,username,name',
          access_token: accessToken
        });

        const instagramResponse = await fetch(`${instagramUrl}?${instagramParams.toString()}`);
        if (instagramResponse.ok) {
          const instagramData = await instagramResponse.json();
          addLog(`Instagram account details: ${JSON.stringify(instagramData)}`);
          
          return { 
            userInfo: {
              id: instagramData.id,
              username: instagramData.username,
              account_type: 'BUSINESS' // Default since we know it's a business account
            }, 
            pageId: instagramId 
          };
        } else {
          const errorData = await instagramResponse.json();
          addLog(`Instagram account fetch failed: ${JSON.stringify(errorData)}`);
        }
      } else {
        addLog(`Page ${page.name} has no Instagram Business Account`);
      }
    }

    throw new Error('No Instagram Business account found');
  };

  // Handle authentication
  const handleAuth = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    setDebugLogs([]);
    
    try {
      if (!sdkLoaded) {
        throw new Error('Facebook SDK not loaded yet. Please wait...');
      }

      addLog('Starting Instagram Reels Poster authentication...');
      
      // First check if already logged in
      const existingAuth = await checkLoginStatus();
      if (existingAuth) {
        addLog('Already logged in, using existing token');
        await handleAuthSuccess(existingAuth);
        return;
      }

      // Login with Facebook SDK
      const authResponse = await loginWithFacebookSDK();
      await handleAuthSuccess(authResponse);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Authentication error: ${errorMessage}`);
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = async (authResponse: FacebookAuthResponse) => {
    try {
      addLog(`Processing auth response for user: ${authResponse.userID}`);
      addLog(`Access token expires in: ${authResponse.expiresIn} seconds`);
      addLog(`Granted scopes: ${authResponse.grantedScopes}`);

      // Get long-lived token
      const longLivedToken = await getLongLivedToken(authResponse.accessToken);
      addLog(`Long-lived token obtained: ${longLivedToken.substring(0, 20)}...`);

      // Get Instagram account info
      const { userInfo, pageId } = await getInstagramAccount(longLivedToken);
      addLog(`Instagram account found: ${userInfo.username} (${userInfo.id})`);
      addLog(`Account type: ${userInfo.account_type}`);
      addLog(`Instagram Page ID: ${pageId}`);

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userInfo,
        longLivedToken,
        instagramPageId: pageId,
        facebookUserId: authResponse.userID
      });

      addLog('Authentication completed successfully!');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Auth success processing error: ${errorMessage}`);
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
    }
  };

  // Logout
  const handleLogout = () => {
    if ((window as WindowWithFB).FB) {
      (window as WindowWithFB).FB.logout(() => {
        addLog('Logged out successfully');
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: null,
          userInfo: null,
          longLivedToken: null,
          instagramPageId: null,
          facebookUserId: null
        });
        setDebugLogs([]);
      });
    }
  };

  // Test Reels posting capability
  const testReelsCapability = async () => {
    if (!authState.isAuthenticated || !authState.longLivedToken || !authState.instagramPageId) {
      addLog('Not authenticated - cannot test Reels capability');
      return;
    }

    addLog('Testing Reels posting capability...');
    
    try {
      // Test creating a media container (without actually posting)
      const testUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${authState.instagramPageId}/media`;
      const testData = {
        video_url: 'https://example.com/test-video.mp4', // Dummy URL for testing
        caption: 'Test caption for Reels capability',
        access_token: authState.longLivedToken
      };

      addLog('Testing media container creation...');
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        const data = await response.json();
        addLog(`✅ Reels posting capability confirmed! Container ID: ${data.id}`);
        addLog('Your account can post Reels!');
      } else {
        const errorData = await response.json();
        addLog(`❌ Reels posting test failed: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      addLog(`Reels capability test error: ${error}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🔍 Instagram Reels Poster Debugger
        </h2>
        <p className="text-gray-600">
          Debug component to test Instagram Reels Poster authentication and account details
        </p>
      </div>

      {/* Status Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Authentication Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${sdkLoaded ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>Facebook SDK: {sdkLoaded ? 'Loaded' : 'Loading...'}</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${authState.isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>Authenticated: {authState.isAuthenticated ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${authState.isLoading ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
            <span>Loading: {authState.isLoading ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${authState.error ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span>Error: {authState.error ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      {/* Account Information */}
      {authState.isAuthenticated && authState.userInfo && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">Account Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Instagram ID:</strong> {authState.userInfo.id}</div>
            <div><strong>Username:</strong> @{authState.userInfo.username}</div>
            <div><strong>Account Type:</strong> {authState.userInfo.account_type}</div>
            <div><strong>Instagram Page ID:</strong> {authState.instagramPageId}</div>
            <div><strong>Facebook User ID:</strong> {authState.facebookUserId}</div>
            <div><strong>Token Status:</strong> {authState.longLivedToken ? 'Valid' : 'Missing'}</div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {authState.error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <h3 className="text-lg font-semibold mb-2 text-red-800">Error</h3>
          <p className="text-red-700">{authState.error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={handleAuth}
          disabled={!sdkLoaded || authState.isLoading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {authState.isLoading ? 'Authenticating...' : 'Connect Instagram'}
        </button>
        
        {authState.isAuthenticated && (
          <>
            <button
              onClick={testReelsCapability}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Test Reels Capability
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </>
        )}
      </div>

      {/* Debug Logs */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Debug Logs</h3>
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
          {debugLogs.length === 0 ? (
            <div className="text-gray-500">No logs yet. Click &quot;Connect Instagram&quot; to start debugging.</div>
          ) : (
            debugLogs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))
          )}
        </div>
      </div>

      {/* Configuration */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Configuration</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>App ID:</strong> {INSTAGRAM_CONFIG.appId}</div>
          <div><strong>API Version:</strong> {INSTAGRAM_CONFIG.apiVersion}</div>
          <div className="col-span-2"><strong>Scopes:</strong> {INSTAGRAM_CONFIG.scope}</div>
        </div>
      </div>
    </div>
  );
}
