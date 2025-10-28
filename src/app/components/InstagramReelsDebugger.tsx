/* eslint-disable @typescript-eslint/no-explicit-any */
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
      if ((window as any).FB) {
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
        (window as any).fbAsyncInit = () => {
          (window as any).FB.init({
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
      if (!(window as any).FB) {
        addLog('Facebook SDK not loaded');
        resolve(null);
        return;
      }

      (window as any).FB.getLoginStatus((response: DebugFacebookLoginResponse) => {
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
      if (!(window as any).FB) {
        reject(new Error('Facebook SDK not loaded'));
        return;
      }

      addLog('Starting Facebook SDK login...');
      (window as any).FB.login((response: DebugFacebookLoginResponse) => {
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
          
          // Get real account type from Facebook Page Instagram connection
          const pageUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${page.id}`;
          const pageParams = new URLSearchParams({
            fields: 'instagram_business_account{account_type}',
            access_token: page.access_token
          });
          
          const pageResponse = await fetch(`${pageUrl}?${pageParams.toString()}`);
          let accountType = 'BUSINESS'; // Default fallback
          
          if (pageResponse.ok) {
            const pageData = await pageResponse.json();
            if (pageData.instagram_business_account?.account_type) {
              accountType = pageData.instagram_business_account.account_type;
              addLog(`Real account type from API: ${accountType}`);
            }
          }
          
          return { 
            userInfo: {
              id: instagramData.id,
              username: instagramData.username,
              account_type: accountType
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
    if ((window as any).FB) {
      (window as any).FB.logout(() => {
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
      // Test 1: Check if we can access the Instagram account with publishing permissions
      const accountUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${authState.instagramPageId}`;
      const accountParams = new URLSearchParams({
        fields: 'id,username,name',
        access_token: authState.longLivedToken
      });

      addLog('Testing Instagram account access...');
      const accountResponse = await fetch(`${accountUrl}?${accountParams.toString()}`);
      
      if (accountResponse.ok) {
        const accountData = await accountResponse.json();
        addLog(`✅ Instagram account accessible: ${accountData.username}`);
        
        // Test 2: Check if we have the required permissions by testing a simple API call
        const permissionsUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/me/permissions`;
        const permissionsResponse = await fetch(`${permissionsUrl}?access_token=${authState.longLivedToken}`);
        
        if (permissionsResponse.ok) {
          const permissionsData = await permissionsResponse.json();
          const hasPublishPermission = permissionsData.data.some((perm: any) => 
            perm.permission === 'instagram_content_publish' && perm.status === 'granted'
          );
          
          if (hasPublishPermission) {
            addLog('✅ Instagram content publish permission granted');
            addLog('✅ Reels posting capability confirmed!');
            addLog('Your account can post Reels!');
            
            // Test 3: Try actual Reels posting with demo video
            addLog('Testing actual Reels posting with demo video...');
            await testActualReelsPosting();
          } else {
            addLog('❌ Instagram content publish permission not granted');
          }
        } else {
          addLog('❌ Could not check permissions');
        }
      } else {
        const errorData = await accountResponse.json();
        addLog(`❌ Instagram account access failed: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      addLog(`Reels capability test error: ${error}`);
    }
  };

  // Test actual Reels posting with demo video
  const testActualReelsPosting = async () => {
    try {
      // Step 1: Upload video to backend and get public URL
      addLog('Step 1: Uploading demo video to backend...');
      
      const formData = new FormData();
      formData.append('file', new File([''], 'demo.mp4', { type: 'video/mp4' }));
      
      // For testing, we'll use a direct URL to the demo video
      const demoVideoUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backrooms-e8nm.onrender.com'}/static/demo.mp4`;
      addLog(`Using demo video URL: ${demoVideoUrl}`);
      
      // Step 2: Create media container
      addLog('Step 2: Creating media container...');
      const containerUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${authState.instagramPageId}/media`;
      const containerData = {
        video_url: demoVideoUrl,
        caption: '🎬 Test Reel from Instagram Reels Debugger - Posted via API! #test #reels #api',
        access_token: authState.longLivedToken
      };

      const containerResponse = await fetch(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(containerData)
      });

      if (containerResponse.ok) {
        const containerResult = await containerResponse.json();
        const containerId = containerResult.id;
        addLog(`✅ Media container created: ${containerId}`);
        
        // Step 3: Check container status
        addLog('Step 3: Checking container status...');
        await checkContainerStatus(containerId);
        
      } else {
        const errorData = await containerResponse.json();
        addLog(`❌ Container creation failed: ${JSON.stringify(errorData)}`);
      }
      
    } catch (error) {
      addLog(`❌ Reels posting test error: ${error}`);
    }
  };

  // Check container status and publish if ready
  const checkContainerStatus = async (containerId: string) => {
    try {
      const statusUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${containerId}`;
      const statusParams = new URLSearchParams({
        fields: 'status_code',
        access_token: authState.longLivedToken!
      });

      const statusResponse = await fetch(`${statusUrl}?${statusParams.toString()}`);
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        addLog(`Container status: ${statusData.status_code}`);
        
        if (statusData.status_code === 'FINISHED') {
          addLog('✅ Container processing finished! Publishing Reel...');
          await publishReel(containerId);
        } else if (statusData.status_code === 'IN_PROGRESS') {
          addLog('⏳ Container still processing, checking again in 5 seconds...');
          setTimeout(() => checkContainerStatus(containerId), 5000);
        } else {
          addLog(`❌ Container failed with status: ${statusData.status_code}`);
        }
      } else {
        const errorData = await statusResponse.json();
        addLog(`❌ Status check failed: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      addLog(`❌ Status check error: ${error}`);
    }
  };

  // Publish the Reel
  const publishReel = async (containerId: string) => {
    try {
      const publishUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${authState.instagramPageId}/media_publish`;
      const publishData = {
        creation_id: containerId,
        access_token: authState.longLivedToken!
      };

      const publishResponse = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publishData)
      });

      if (publishResponse.ok) {
        const publishResult = await publishResponse.json();
        addLog(`🎉 SUCCESS! Reel published with ID: ${publishResult.id}`);
        addLog('✅ Your Instagram Reel has been posted successfully!');
      } else {
        const errorData = await publishResponse.json();
        addLog(`❌ Publishing failed: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      addLog(`❌ Publishing error: ${error}`);
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
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Authentication Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${sdkLoaded ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-gray-700">Facebook SDK: {sdkLoaded ? 'Loaded' : 'Loading...'}</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${authState.isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-gray-700">Authenticated: {authState.isAuthenticated ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${authState.isLoading ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>
            <span className="text-gray-700">Loading: {authState.isLoading ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${authState.error ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span className="text-gray-700">Error: {authState.error ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      {/* Account Information */}
      {authState.isAuthenticated && authState.userInfo && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">Account Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-gray-700"><strong className="text-gray-800">Instagram ID:</strong> {authState.userInfo.id}</div>
            <div className="text-gray-700"><strong className="text-gray-800">Username:</strong> @{authState.userInfo.username}</div>
            <div className="text-gray-700"><strong className="text-gray-800">Account Type:</strong> {authState.userInfo.account_type}</div>
            <div className="text-gray-700"><strong className="text-gray-800">Instagram Page ID:</strong> {authState.instagramPageId}</div>
            <div className="text-gray-700"><strong className="text-gray-800">Facebook User ID:</strong> {authState.facebookUserId}</div>
            <div className="text-gray-700"><strong className="text-gray-800">Token Status:</strong> {authState.longLivedToken ? 'Valid' : 'Missing'}</div>
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
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Debug Logs</h3>
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
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Configuration</h3>
        <div className="grid grid-cols-1 gap-4 text-sm">
          <div className="flex justify-between">
            <div className="text-gray-700"><strong className="text-gray-800">App ID:</strong> {INSTAGRAM_CONFIG.appId}</div>
            <div className="text-gray-700"><strong className="text-gray-800">API Version:</strong> {INSTAGRAM_CONFIG.apiVersion}</div>
          </div>
          <div className="text-gray-700">
            <strong className="text-gray-800">Scopes:</strong>
            <div className="mt-1 flex flex-wrap gap-2">
              {INSTAGRAM_CONFIG.scope.split(',').map((scope, index) => (
                <span key={index} className="inline-block bg-gray-100 px-2 py-1 rounded text-xs">
                  {scope.trim()}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
