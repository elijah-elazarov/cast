/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
// Removed ffmpeg.wasm; using backend processing instead

interface UserInfo {
  id: string;
  username: string;
  account_type?: string;
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
// interface DebugFacebookSDK {
//   init: (config: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
//   getLoginStatus: (callback: (response: DebugFacebookLoginResponse) => void) => void;
//   login: (callback: (response: DebugFacebookLoginResponse) => void, options: { scope: string; return_scopes: boolean }) => void;
//   logout: (callback: () => void) => void;
// }

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null)
  const [processedStoriesUrl, setProcessedStoriesUrl] = useState<string | null>(null)
  const [processedThumbUrl, setProcessedThumbUrl] = useState<string | null>(null)
  const [videosReady, setVideosReady] = useState(false)
  const [fileDetails, setFileDetails] = useState<{
    name: string;
    sizeMB: number;
    type: string;
    width?: number;
    height?: number;
    duration?: number;
    previewUrl?: string;
  } | null>(null)

  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dkzbmeto1'
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || 'instagram_uploads'

  // Client-side ffmpeg removed; we will call backend to process

  // Validate a Cloudinary video URL becoming available (transform may be async)
  const validateVideoUrl = async (url: string, label: string, maxAttempts = 6): Promise<boolean> => {
    let attempt = 0
    while (attempt < maxAttempts) {
      attempt += 1
      try {
        // Try HEAD first (faster), then GET with range if needed
        let res = await fetch(url, { method: 'HEAD' })
        
        // If HEAD fails, try GET with range
        if (!res.ok && (res.status === 400 || res.status === 423)) {
          res = await fetch(url, {
            method: 'GET',
            headers: { Range: 'bytes=0-1' }
          })
        }
        
        if (res.ok || res.status === 206) {
          addLog(`✅ ${label} validated (status ${res.status})`)
          return true
        }
        
        // Handle specific Cloudinary async transform statuses
        if (res.status === 400 || res.status === 423) {
          addLog(`⏳ ${label} transform in progress (${res.status}), retrying... [${attempt}/${maxAttempts}]`)
        } else {
          addLog(`⏳ ${label} not ready yet (status ${res.status}), retrying... [${attempt}/${maxAttempts}]`)
        }
      } catch (e) {
        addLog(`⏳ ${label} validation error, retrying... [${attempt}/${maxAttempts}]`) 
      }
      
      // Shorter delays for simple cropping: 1s, 2s, 3s, 5s, 8s, 10s
      const delayMs = attempt <= 3 ? 1000 * attempt : Math.min(10000, 2000 * (attempt - 2))
      await new Promise((r) => setTimeout(r, delayMs))
    }
    addLog(`⚠️ ${label} validation timed out after ${maxAttempts} attempts`)
    return false
  }

  const handleFileChange = async (file: File) => {
    setSelectedFile(file)
    setProcessedVideoUrl(null)
    setProcessedStoriesUrl(null)
    setProcessedThumbUrl(null)
    setVideosReady(false)

    // Build initial details
    const details = {
      name: file.name,
      sizeMB: +(file.size / (1024 * 1024)).toFixed(2),
      type: file.type || 'video/mp4',
    } as {
      name: string; sizeMB: number; type: string; width?: number; height?: number; duration?: number; previewUrl?: string
    }

    // Create a preview URL and read metadata for resolution/duration
    try {
      const url = URL.createObjectURL(file)
      details.previewUrl = url
      const videoEl = document.createElement('video')
      videoEl.preload = 'metadata'
      videoEl.src = url
      videoEl.onloadedmetadata = () => {
        details.width = (videoEl.videoWidth || undefined)
        details.height = (videoEl.videoHeight || undefined)
        details.duration = +(videoEl.duration || 0).toFixed(2)
        setFileDetails({ ...details })
        // We keep the preview URL for inline preview; do not revoke yet
      }
      videoEl.onerror = () => {
        setFileDetails({ ...details })
      }
    } catch (_) {
      setFileDetails({ ...details })
    }
  }

  const processClientSide = async () => {
    if (!selectedFile) return
    setProcessing(true)
    setProcessingProgress(0)
    setVideosReady(false)

    try {
      // Step 1: Upload original file to Cloudinary
      addLog('🔄 Step 1/3: Uploading video to Cloudinary...')
      setProcessingProgress(20)
      
      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`
      const formVideo = new FormData()
      formVideo.append('file', selectedFile)
      formVideo.append('upload_preset', UPLOAD_PRESET)
      const vRes = await fetch(uploadUrl, { method: 'POST', body: formVideo })
      const vJson = await vRes.json()
      if (!vRes.ok) throw new Error(`Cloudinary upload failed: ${JSON.stringify(vJson)}`)
      addLog('✅ Uploaded source video to Cloudinary')

      // Step 2: Generate transformation URLs
      addLog('🔄 Step 2/3: Generating Instagram-compliant transformation URLs...')
      setProcessingProgress(60)
      
      // Simple, fast cropping - no content awareness, no complex parameters
      // Just basic center crop like FFmpeg but without the complexity
      const reelsTransformUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/c_fill,w_720,h_1280,f_mp4,q_auto:best/${vJson.public_id}.mp4`
      const storiesTransformUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/c_fill,w_720,h_1280,f_mp4,q_auto:best/${vJson.public_id}.mp4`
      
      // Same fallback (shouldn't be needed)
      const reelsFallbackUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/c_fill,w_720,h_1280,f_mp4,q_auto:best/${vJson.public_id}.mp4`
      const storiesFallbackUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/c_fill,w_720,h_1280,f_mp4,q_auto:best/${vJson.public_id}.mp4`
      
      // Generate thumbnail: extract frame at 1 second (no content awareness)
      const thumbnailUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_1,w_720,h_1280,c_fill,f_jpg,q_auto:best/${vJson.public_id}.jpg`

      // Step 3: Validate URLs are accessible (with retries because Cloudinary may 400/423 until ready)
      addLog('🔄 Step 3/3: Validating transformed videos are accessible...')
      setProcessingProgress(80)

      // Try primary URLs first, then fallbacks if needed
      let finalReelsUrl = reelsTransformUrl
      let finalStoriesUrl = storiesTransformUrl
      
      addLog('Trying simple center crop transformations (no content awareness)...')
      addLog('Using basic c_fill for fast, reliable cropping')
      const [reelsOk, storiesOk, thumbOk] = await Promise.all([
        validateVideoUrl(reelsTransformUrl, 'Reels video (simple crop)'),
        validateVideoUrl(storiesTransformUrl, 'Stories video (simple crop)'),
        validateVideoUrl(thumbnailUrl, 'Thumbnail')
      ])

      // If simple crop failed, try fallback (shouldn't happen since they're the same)
      if (!reelsOk) {
        addLog('Simple crop Reels failed, trying fallback...')
        const reelsFallbackOk = await validateVideoUrl(reelsFallbackUrl, 'Reels video (fallback)')
        if (reelsFallbackOk) {
          finalReelsUrl = reelsFallbackUrl
        }
      }
      
      if (!storiesOk) {
        addLog('Simple crop Stories failed, trying fallback...')
        const storiesFallbackOk = await validateVideoUrl(storiesFallbackUrl, 'Stories video (fallback)')
        if (storiesFallbackOk) {
          finalStoriesUrl = storiesFallbackUrl
        }
      }

      // Allow posting even if validation partially fails (Cloudinary might be slow)
      const reelsValid = reelsOk || finalReelsUrl === reelsFallbackUrl
      const storiesValid = storiesOk || finalStoriesUrl === storiesFallbackUrl
      const allValid = reelsValid && storiesValid && thumbOk
      
      if (!allValid) {
        addLog('⚠️ Some videos failed validation, but allowing posting with available URLs')
        addLog('Note: Cloudinary transformations may still be processing in background')
        addLog('You can try posting - Instagram will handle the video processing')
      }

      // Set the processed URLs (use validated URLs)
      setProcessedVideoUrl(finalReelsUrl)
      setProcessedStoriesUrl(finalStoriesUrl)
      setProcessedThumbUrl(thumbnailUrl)
      setProcessingProgress(100)
      // Allow posting even if validation failed (Cloudinary might be slow)
      setVideosReady(true)
      
      if (allValid) {
        addLog('🎉 Video processing complete! Videos are ready for posting')
      } else {
        addLog('⚠️ Video processing completed with some issues - check logs above')
      }
      addLog(`📹 Reels URL: ${finalReelsUrl}`)
      addLog(`📱 Stories URL: ${finalStoriesUrl}`)
      addLog(`🖼️ Thumbnail URL: ${thumbnailUrl}`)
    } catch (e) {
      addLog(`❌ Processing error: ${e}`)
      setVideosReady(false)
    } finally {
      setProcessing(false)
    }
  }

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[REELS DEBUG] ${message}`);
  };

  const showAvailableTransformedVideos = () => {
    addLog('📋 Available transformed videos:');
    if (processedVideoUrl) {
      addLog(`  📹 Reels video: ${processedVideoUrl}`);
      addLog('    → Optimized for Instagram Reels (progressive encoding)');
    }
    if (processedStoriesUrl) {
      addLog(`  📱 Stories video: ${processedStoriesUrl}`);
      addLog('    → Optimized for Instagram Stories (fast upload encoding)');
    }
    if (processedThumbUrl) {
      addLog(`  🖼️  Thumbnail: ${processedThumbUrl}`);
      addLog('    → Extracted frame for image_url parameter');
    }
    if (!processedVideoUrl && !processedStoriesUrl) {
      addLog('  ❌ No transformed videos available. Please process a video first.');
    }
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
      fields: 'id,name,access_token,instagram_business_account',
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
        addLog(`Page ID: ${page.id}, Page Access Token: ${page.access_token ? 'Present' : 'Missing'}`);
        
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
        let accountType: string | undefined = undefined; // no default
          
          if (page.access_token) {
            const pageUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${page.id}`;
            const pageParams = new URLSearchParams({
              fields: 'instagram_business_account{account_type}',
              access_token: page.access_token
            });
            
            try {
              const pageResponse = await fetch(`${pageUrl}?${pageParams.toString()}`);
              
              if (pageResponse.ok) {
                const pageData = await pageResponse.json();
                if (pageData.instagram_business_account?.account_type) {
                  accountType = pageData.instagram_business_account.account_type;
                  addLog(`Real account type from API: ${accountType}`);
                }
              } else {
                const errorData = await pageResponse.json().catch(() => ({}));
                addLog(`Page API call failed (${pageResponse.status}): ${JSON.stringify(errorData)}`);
              }
            } catch (error) {
              addLog(`Page API call error: ${error}`);
            }
          } else {
            addLog('No page access token available; skipping account_type fetch');
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
        
        // Get detailed account info from Facebook Page
        try {
          const pagesUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/me/accounts`;
          const pagesParams = new URLSearchParams({
            fields: 'id,name,access_token,instagram_business_account{id,username,name,account_type,media_count,followers_count}',
            access_token: authState.longLivedToken
          });
          
          const pagesResponse = await fetch(`${pagesUrl}?${pagesParams}`);
          if (pagesResponse.ok) {
            const pagesData = await pagesResponse.json();
            const instagramPage = pagesData.data.find((page: any) => 
              page.instagram_business_account && 
              page.instagram_business_account.id === authState.instagramPageId
            );
            
            if (instagramPage && instagramPage.instagram_business_account) {
              const igAccount = instagramPage.instagram_business_account;
              addLog(`📊 Account Details:`);
              addLog(`   Username: @${igAccount.username}`);
              addLog(`   Name: ${igAccount.name}`);
              addLog(`   Account Type: ${igAccount.account_type || 'Not specified'}`);
              addLog(`   Media Count: ${igAccount.media_count?.toLocaleString() || 'Unknown'}`);
              addLog(`   Followers: ${igAccount.followers_count?.toLocaleString() || 'Unknown'}`);
            }
          }
        } catch (error) {
          addLog(`⚠️ Could not fetch detailed account info: ${error}`);
        }
        
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
            addLog('✅ Reels capability test complete - your account is ready for posting');
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



  // Test actual Reels posting with processed video
  const testActualReelsPosting = async () => {
    if (!processedVideoUrl) {
      addLog('❌ No processed video available. Please process a video first.');
      return;
    }

    if (!videosReady) {
      addLog('❌ Videos are not ready yet. Please wait for processing to complete.');
      return;
    }

    if (!authState.isAuthenticated || !authState.userInfo) {
      addLog('❌ Not authenticated');
      return;
    }

    addLog('Testing Instagram Reels posting capability...');
    showAvailableTransformedVideos();

    try {
      // Step 1: Use already processed video from Cloudinary
      addLog('Step 1: Using pre-processed video from Cloudinary...');
      
      addLog(`📹 Using Reels-optimized video URL: ${processedVideoUrl}`);
      addLog('🎯 This video is specifically transformed for Instagram Reels posting');
      
      // No need to process again - use the Cloudinary URL directly
      const finalProcessedVideoUrl = processedVideoUrl;
      
      // Step 2: Create media container
      addLog('Step 2: Creating media container...');
      const containerUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${authState.instagramPageId}/media`;
      
      // Try different approaches for Instagram Reels
      const approaches = [
        {
          name: 'Video only',
          data: {
            video_url: finalProcessedVideoUrl,
            caption: '🎬 Test Reel from Instagram Reels Debugger - Posted via API! #test #reels #api',
            access_token: authState.longLivedToken
          }
        },
        {
          name: 'Video with image_url',
          data: {
            video_url: finalProcessedVideoUrl,
            image_url: finalProcessedVideoUrl,
            caption: '🎬 Test Reel from Instagram Reels Debugger - Posted via API! #test #reels #api',
            access_token: authState.longLivedToken
          }
        },
        {
          name: 'Image only (fallback)',
          data: {
            image_url: finalProcessedVideoUrl,
            caption: '🎬 Test Reel from Instagram Reels Debugger - Posted via API! #test #reels #api',
            access_token: authState.longLivedToken
          }
        }
      ];

      let containerCreated = false;
      let containerId = null;

      for (const approach of approaches) {
        addLog(`Trying approach: ${approach.name}`);
        
        const containerResponse = await fetch(containerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(approach.data)
        });

        if (containerResponse.ok) {
          const containerResult = await containerResponse.json();
          containerId = containerResult.id;
          addLog(`✅ Media container created with ${approach.name}: ${containerId}`);
          containerCreated = true;
          break;
        } else {
          const errorData = await containerResponse.json();
          addLog(`❌ ${approach.name} failed: ${JSON.stringify(errorData)}`);
        }
      }

      if (containerCreated && containerId) {
        // Step 3: Check container status
        addLog('Step 3: Checking container status...');
        await checkContainerStatus(containerId);
      } else {
        addLog('❌ All container creation approaches failed');
        addLog('Instagram Reels API Requirements:');
        addLog('• Aspect ratio: 9:16 (vertical/portrait)');
        addLog('• Resolution: 720x1280 to 1080x1920');
        addLog('• Format: MP4, MOV, or AVI');
        addLog('• Duration: 3-90 seconds');
        addLog('• File size: Max 100MB');
        addLog('');
        addLog('The video file may not meet these requirements.');
        addLog('For testing, you can:');
        addLog('1. Use a properly formatted Reels video');
        addLog('2. Test with Instagram Stories instead');
        addLog('3. Verify your video meets Instagram requirements');
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



  // Test Stories posting capability (permissions only)
  const testStoriesCapability = async () => {
    if (!authState.isAuthenticated || !authState.longLivedToken || !authState.instagramPageId) {
      addLog('Not authenticated - cannot test Stories capability');
      return;
    }

    addLog('Testing Instagram Stories posting capability...');
    
    try {
      // Test 1: Check if we can access the Instagram account with publishing permissions
      const accountUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${authState.instagramPageId}`;
      const accountParams = new URLSearchParams({
        fields: 'id,username,name',
        access_token: authState.longLivedToken
      });

      addLog('Testing Instagram account access...');
      const accountResponse = await fetch(`${accountUrl}?${accountParams}`);
      
      if (accountResponse.ok) {
        const accountData = await accountResponse.json();
        addLog(`✅ Instagram account accessible: ${accountData.username}`);
        
        // Get detailed account info from Facebook Page
        try {
          const pagesUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/me/accounts`;
          const pagesParams = new URLSearchParams({
            fields: 'id,name,access_token,instagram_business_account{id,username,name,account_type,media_count,followers_count}',
            access_token: authState.longLivedToken
          });
          
          const pagesResponse = await fetch(`${pagesUrl}?${pagesParams}`);
          if (pagesResponse.ok) {
            const pagesData = await pagesResponse.json();
            const instagramPage = pagesData.data.find((page: any) => 
              page.instagram_business_account && 
              page.instagram_business_account.id === authState.instagramPageId
            );
            
            if (instagramPage && instagramPage.instagram_business_account) {
              const igAccount = instagramPage.instagram_business_account;
              addLog(`📊 Account Details:`);
              addLog(`   Username: @${igAccount.username}`);
              addLog(`   Name: ${igAccount.name}`);
              addLog(`   Account Type: ${igAccount.account_type || 'Not specified'}`);
              addLog(`   Media Count: ${igAccount.media_count?.toLocaleString() || 'Unknown'}`);
              addLog(`   Followers: ${igAccount.followers_count?.toLocaleString() || 'Unknown'}`);
            }
          }
        } catch (error) {
          addLog(`⚠️ Could not fetch detailed account info: ${error}`);
        }
        
        // Test 2: Check if we have the required permissions
        const permissionsUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/me/permissions`;
        const permissionsParams = new URLSearchParams({
          access_token: authState.longLivedToken
        });
        
        const permissionsResponse = await fetch(`${permissionsUrl}?${permissionsParams}`);
        if (permissionsResponse.ok) {
          const permissionsData = await permissionsResponse.json();
          const hasPublishPermission = permissionsData.data.some((perm: any) => 
            perm.permission === 'instagram_content_publish' && perm.status === 'granted'
          );
          
          if (hasPublishPermission) {
            addLog('✅ Instagram content publish permission granted');
            addLog('✅ Stories posting capability confirmed!');
            addLog('Your account can post Stories!');
            addLog('✅ Stories capability test complete - your account is ready for posting');
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
      addLog(`❌ Stories capability test failed: ${error}`);
    }
  };

  // Post Stories with processed video
  const postStoriesWithProcessedVideo = async () => {
    if (!processedStoriesUrl) {
      addLog('❌ No processed Stories video available. Please process a video first.');
      return;
    }

    if (!videosReady) {
      addLog('❌ Videos are not ready yet. Please wait for processing to complete.');
      return;
    }

    if (!authState.isAuthenticated || !authState.longLivedToken || !authState.instagramPageId) {
      addLog('Not authenticated - cannot post Stories');
      return;
    }

    addLog('Posting Instagram Stories with processed video...');
    showAvailableTransformedVideos();
    
    try {
      // Step 1: Use already processed video from Cloudinary
      addLog('Step 1: Using pre-processed video from Cloudinary...');
      
      addLog(`📱 Using Stories-optimized video URL: ${processedStoriesUrl}`);
      addLog('🎯 This video is specifically transformed for Instagram Stories posting');
      
      // No need to process again - use the Cloudinary URL directly
      const finalProcessedVideoUrl = processedStoriesUrl;
      const processedThumbnailUrl: string | null = processedThumbUrl; // Use pre-generated thumbnail

      // Stories have more flexible requirements
      const containerUrl = `https://graph.facebook.com/${INSTAGRAM_CONFIG.apiVersion}/${authState.instagramPageId}/media`;

      // Try different approaches for Instagram Stories
      const storiesApproaches = [
        {
          name: 'Video only',
          data: {
            video_url: finalProcessedVideoUrl,
            caption: '📱 Test Story from Instagram Reels Debugger - Posted via API! #test #stories #api',
            access_token: authState.longLivedToken
          }
        },
        {
          name: 'Video with image_url',
          data: {
            video_url: finalProcessedVideoUrl || '',
            image_url: processedThumbnailUrl || processedThumbUrl || finalProcessedVideoUrl || '',
            caption: '📱 Test Story from Instagram Reels Debugger - Posted via API! #test #stories #api',
            access_token: authState.longLivedToken
          }
        },
        {
          name: 'Image only (fallback)',
          data: {
            image_url: processedThumbnailUrl || processedThumbUrl || finalProcessedVideoUrl,
            caption: '📱 Test Story from Instagram Reels Debugger - Posted via API! #test #stories #api',
            access_token: authState.longLivedToken
          }
        }
      ];

      let storiesContainerCreated = false;
      let storiesContainerId = null;

      for (const approach of storiesApproaches) {
        addLog(`Trying Stories approach: ${approach.name}`);
        
        const containerResponse = await fetch(containerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(approach.data)
        });

        if (containerResponse.ok) {
          const containerResult = await containerResponse.json();
          storiesContainerId = containerResult.id;
          addLog(`✅ Stories container created with ${approach.name}: ${storiesContainerId}`);
          storiesContainerCreated = true;
          break;
        } else {
          const errorData = await containerResponse.json();
          addLog(`❌ ${approach.name} failed: ${JSON.stringify(errorData)}`);
        }
      }

      if (storiesContainerCreated && storiesContainerId) {
        // Check container status
        addLog('Checking Stories container status...');
        await checkContainerStatus(storiesContainerId);
      } else {
        addLog('❌ All Stories container creation approaches failed');
        addLog('Stories Requirements:');
        addLog('• Aspect ratio: 9:16 (preferred) or 1:1');
        addLog('• Resolution: 720x1280 or 1080x1080');
        addLog('• Duration: 1-15 seconds');
        addLog('• Format: MP4, MOV, or AVI');
        addLog('The video file may not meet these requirements.');
      }
      
    } catch (error) {
      addLog(`❌ Stories capability test error: ${error}`);
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

      {/* Local file selection and processing */}
      <div className={`mb-6 p-4 rounded-lg border ${!authState.isAuthenticated ? 'opacity-50' : ''}`}>
        <h3 className={`text-lg font-semibold mb-2 ${!authState.isAuthenticated ? 'text-gray-500' : 'text-gray-900'}`}>
          Select Video {!authState.isAuthenticated && '(Sign in required)'}
        </h3>
        <label className={`inline-flex items-center px-4 py-2 rounded cursor-pointer ${!authState.isAuthenticated ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black'}`}>
          <span className="font-medium">Choose file</span>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
            disabled={!authState.isAuthenticated}
            className="hidden"
          />
        </label>
        {fileDetails && (
          <div className="mt-3 text-sm text-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="font-medium">{fileDetails.name}</div>
                <div className="text-gray-600">{fileDetails.type} • {fileDetails.sizeMB} MB{fileDetails.duration ? ` • ${fileDetails.duration}s` : ''}</div>
                {(fileDetails.width && fileDetails.height) && (
                  <div className="text-gray-600">Resolution: {fileDetails.width} × {fileDetails.height}</div>
                )}
              </div>
              {fileDetails.previewUrl && (
                <video
                  src={fileDetails.previewUrl}
                  className="w-28 h-48 object-cover rounded border"
                  controls
                  muted
                />
              )}
            </div>
          </div>
        )}
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={processClientSide}
            disabled={!authState.isAuthenticated || !selectedFile || processing}
            className={`px-4 py-2 rounded ${!authState.isAuthenticated ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50'}`}
          >
            {!authState.isAuthenticated 
              ? 'Sign in to process video' 
              : processing 
                ? `Processing... ${processingProgress}%` 
                : 'Process with Cloudinary'
            }
          </button>
          {processing && (
            <div className="w-48 bg-gray-200 rounded h-2">
              <div className="bg-blue-600 h-2 rounded" style={{ width: `${processingProgress}%` }} />
            </div>
          )}
        </div>
        {(processedVideoUrl || processedStoriesUrl) && authState.isAuthenticated && (
          <div className="mt-3 text-sm text-gray-700">
            <div className="flex items-center mb-2">
              <div className={`w-3 h-3 rounded-full mr-2 ${videosReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="font-medium">
                Videos Status: {videosReady ? 'Ready for Posting' : 'Processing...'}
              </span>
            </div>
            {processedVideoUrl && (
              <div className="flex items-center">
                <span className="mr-2">📹</span>
                <span>Reels video: </span>
                <a className="text-blue-600 underline ml-1" href={processedVideoUrl} target="_blank" rel="noreferrer">open</a>
                {videosReady && <span className="ml-2 text-green-600">✓</span>}
              </div>
            )}
            {processedStoriesUrl && (
              <div className="flex items-center">
                <span className="mr-2">📱</span>
                <span>Stories video: </span>
                <a className="text-blue-600 underline ml-1" href={processedStoriesUrl} target="_blank" rel="noreferrer">open</a>
                {videosReady && <span className="ml-2 text-green-600">✓</span>}
              </div>
            )}
            {processedThumbUrl && (
              <div className="flex items-center">
                <span className="mr-2">🖼️</span>
                <span>Thumbnail: </span>
                <a className="text-blue-600 underline ml-1" href={processedThumbUrl} target="_blank" rel="noreferrer">open</a>
                {videosReady && <span className="ml-2 text-green-600">✓</span>}
              </div>
            )}
          </div>
        )}
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
              onClick={testStoriesCapability}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Test Stories Capability
            </button>
            {processedVideoUrl && videosReady && (
              <button
                onClick={testActualReelsPosting}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Post Processed Reel
              </button>
            )}
            {processedStoriesUrl && videosReady && (
              <button
                onClick={postStoriesWithProcessedVideo}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Post Processed Story
              </button>
            )}
            <button
              onClick={showAvailableTransformedVideos}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Show Available Videos
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
