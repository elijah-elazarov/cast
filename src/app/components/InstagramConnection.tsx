'use client';

import { useState, useEffect } from 'react';
import { Check, X, InstagramIcon, AlertTriangle, Facebook } from 'lucide-react';
import ConnectionProgress from './ConnectionProgress';
import ConnectionSuccess from './ConnectionSuccess';

interface InstagramConnectionProps {
  onConnect: (connected: boolean) => void;
}

interface AccountInfo {
  username: string;
  full_name?: string;
  follower_count: number;
  followers_count?: number;
  media_count: number;
  profile_pic_url?: string;
  profile_picture_url?: string;
  account_type?: string;
}

export default function InstagramConnection({ onConnect }: InstagramConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionMethod, setConnectionMethod] = useState<'meta' | 'instagrapi' | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showMethodChoice, setShowMethodChoice] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [justConnectedUsername, setJustConnectedUsername] = useState('');

  // Don't auto-connect on mount - require manual connection
  // useEffect(() => {
  //   const checkConnection = () => {
  //     const storedUsername = localStorage.getItem('instagram_username');
  //     const storedAccountType = localStorage.getItem('instagram_account_type') as 'meta' | 'instagrapi' | null;
  //     
  //     if (storedUsername) {
  //       setIsConnected(true);
  //       setConnectionMethod(storedAccountType || 'instagrapi');
  //       onConnect(true);
  //       // Fetch account info for connected users (only for instagrapi)
  //       if (storedAccountType !== 'meta') {
  //         fetchAccountInfo(storedUsername);
  //       }
  //     }
  //   };

  //   checkConnection();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []); // Only run once on mount

  // Check for OAuth callback success/error from query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const instagramConnected = urlParams.get('instagram_connected');
    const instagramError = urlParams.get('instagram_error');

    if (instagramConnected === 'true') {
      const storedUsername = localStorage.getItem('instagram_username');
      const storedUserId = localStorage.getItem('instagram_user_id');
      
      if (storedUsername && storedUserId) {
        // Show success animation first
        setJustConnectedUsername(storedUsername);
        setShowSuccessAnimation(true);
        
        // After animation, update connection state
        setTimeout(() => {
          setIsConnected(true);
          setConnectionMethod('meta');
          onConnect(true);
          
          // Get additional account info from localStorage if available
          const followersCount = localStorage.getItem('instagram_followers_count');
          const mediaCount = localStorage.getItem('instagram_media_count');
          
          if (followersCount || mediaCount) {
            setAccountInfo({
              username: storedUsername,
              follower_count: followersCount ? parseInt(followersCount) : 0,
              followers_count: followersCount ? parseInt(followersCount) : 0,
              media_count: mediaCount ? parseInt(mediaCount) : 0,
              account_type: 'business'
            });
          }
        }, 3300); // Wait for success animation to complete
      }
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (instagramError) {
      setError(`Failed to connect: ${instagramError}`);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAccountInfo = async (username: string) => {
    try {
      console.log(`[IG] Fetching account info for: ${username}`);
      // Use Next.js API proxy to avoid mixed content issues
      const response = await fetch(`/api/instagram/account-info?username=${username}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('[IG] Account info fetched successfully:', data.data);
        setAccountInfo(data.data);
      } else {
        console.warn('[IG] Failed to fetch account info:', data.detail || data.message);
        // Don't show error to user, just log it
      }
    } catch (err) {
      console.error('[IG] Failed to fetch account info:', err);
      // Don't show error to user, just log it
    }
  };

  const handleMetaConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      console.log('[IG Meta] Getting auth URL');
      // Get authorization URL from backend via Next.js API proxy
      const response = await fetch('/api/instagram/meta/auth-url', {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('[IG Meta] Redirecting to Meta OAuth');
        // Redirect to Meta OAuth page
        window.location.href = data.data.auth_url;
      } else {
        setError('Failed to initialize Instagram connection');
      }
    } catch (err) {
      console.error('[IG Meta] Connect error:', err);
      setError('Failed to connect to Instagram. Please check if the backend service is running.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    if (!showLoginForm) {
      console.log('[IG] Step 1: Showing login form');
      setShowLoginForm(true);
      return;
    }

    if (!username || !password) {
      console.log('[IG] Step 2: Validation failed - missing credentials');
      setError('Please enter both username and password');
      return;
    }

    if (requires2FA && !verificationCode) {
      console.log('[IG] Step 3: Validation failed - missing verification code');
      setError('Please enter your verification code');
      return;
    }

    if (requires2FA && verificationCode.length !== 6) {
      console.log('[IG] Step 4: Validation failed - invalid verification code length');
      setError('Verification code must be 6 digits');
      return;
    }

    console.log(`[IG] Step 5: Starting login attempt | 2FA: ${requires2FA} | Has Code: ${!!verificationCode}`);
    setIsConnecting(true);
    setError(null);

    try {
      // Use Next.js API proxy to avoid mixed content issues
      const response = await fetch('/api/instagram/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ 
          username, 
          password,
          verification_code: requires2FA ? verificationCode : undefined 
        }),
      });

      const data = await response.json();
      
      console.log(`[IG] Step 6: Login response received | Status: ${response.status}`, data);

      if (data.success) {
        console.log('[IG] Step 7: Login successful - storing credentials');
        // Store username and account type in localStorage
        localStorage.setItem('instagram_username', username);
        localStorage.setItem('instagram_account_type', 'instagrapi');
        
        // Show success animation first
        setJustConnectedUsername(username);
        setShowSuccessAnimation(true);
        
        // After animation, update connection state
        setTimeout(() => {
          setIsConnected(true);
          setConnectionMethod('instagrapi');
          onConnect(true);
          setShowLoginForm(false);
          setRequires2FA(false);
          setVerificationCode('');
          fetchAccountInfo(username);
          console.log('[IG] Step 8: Connected successfully');
        }, 3300); // Wait for success animation to complete
      } else {
        // Check if 2FA is required (202 status means accepted but pending 2FA)
        if (response.status === 202 || (data.detail && typeof data.detail === 'object' && data.detail.requires_2fa)) {
          console.log('[IG] Step 7: 2FA required (202 Accepted - pending verification)');
          setRequires2FA(true);
          setError(data.detail?.message || data.message || 'Two-factor authentication required. Please enter your verification code.');
        } else if (response.status === 401 && requires2FA) {
          console.log('[IG] Step 7: Invalid verification code (401 Unauthorized)');
          // Wrong verification code
          setError('Invalid verification code. Please try again.');
        } else {
          console.log('[IG] Step 7: Login failed - unknown error');
          setError(data.detail || data.message || 'Failed to connect to Instagram');
        }
      }
    } catch (err) {
      console.error('[IG] Step 8: Exception caught during login', err);
      setError('Failed to connect to Instagram. Please check if the backend service is running.');
    } finally {
      console.log('[IG] Step 9: Login attempt completed');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const username = localStorage.getItem('instagram_username');
    const userId = localStorage.getItem('instagram_user_id');
    const accountType = localStorage.getItem('instagram_account_type');
    
    if (accountType === 'meta' && userId) {
      try {
        // Meta API logout
        await fetch('/api/instagram/meta/logout', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify({ user_id: userId }),
        });
      } catch (err) {
        console.error('[IG Meta] Logout error:', err);
      }
    } else if (username) {
      try {
        // Instagrapi logout
        await fetch('/api/instagram/logout', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify({ username }),
        });
      } catch (err) {
        console.error('[IG] Logout error:', err);
      }
    }
    
    // Clear all stored credentials
    localStorage.removeItem('instagram_username');
    localStorage.removeItem('instagram_user_id');
    localStorage.removeItem('instagram_account_type');
    localStorage.removeItem('instagram_followers_count');
    localStorage.removeItem('instagram_media_count');
    
    setIsConnected(false);
    setConnectionMethod(null);
    onConnect(false);
    setError(null);
    setAccountInfo(null);
    setShowLoginForm(false);
    setShowMethodChoice(false);
    setRequires2FA(false);
    setVerificationCode('');
    setUsername('');
    setPassword('');
  };

  // Show success animation modal
  if (showSuccessAnimation && justConnectedUsername) {
    return (
      <ConnectionSuccess
        platform="instagram"
        username={justConnectedUsername}
        onComplete={() => setShowSuccessAnimation(false)}
      />
    );
  }

  if (isConnected) {
    const followerCount = accountInfo?.follower_count || accountInfo?.followers_count || 0;
    
    return (
      <div className="space-y-3 animate-[slideIn_0.5s_ease-out]">
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200/50 dark:border-green-700/50 shadow-sm">
          <div className="flex items-center">
            <div className="relative">
              <Check className="w-5 h-5 text-green-500 mr-2" />
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-[ping_2s_ease-out_infinite]" />
            </div>
            <span className="text-green-700 dark:text-green-300 font-medium">
              Connected to Instagram
              {connectionMethod === 'meta' && (
                <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                  Business
                </span>
              )}
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {accountInfo && (
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              @{accountInfo.username}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {followerCount.toLocaleString()} followers • {accountInfo.media_count} posts
            </p>
            {accountInfo.account_type && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Account type: {accountInfo.account_type}
              </p>
            )}
          </div>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your Instagram account is connected and ready for publishing Reels.
        </p>
        
        <style jsx>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!showLoginForm && !showMethodChoice ? (
        <>
          {/* Primary: Meta OAuth (Recommended for Business Accounts) */}
          <button
            onClick={handleMetaConnect}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center shadow-md"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Connecting...
              </>
            ) : (
              <>
                <Facebook className="w-5 h-5 mr-2" />
                Connect with Meta (Business)
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">Or</span>
            </div>
          </div>

          {/* Secondary: Direct Login (Personal Accounts) */}
          <button
            onClick={() => setShowLoginForm(true)}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center"
          >
            <InstagramIcon className="w-4 h-4 mr-2" />
            Direct Login (Personal)
          </button>
          
          <div className="flex items-start p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Choose your connection method:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><strong>Meta OAuth:</strong> For Business/Creator accounts (recommended, safer)</li>
                <li><strong>Direct Login:</strong> For Personal accounts (username/password)</li>
              </ul>
            </div>
          </div>
          
          {/* Connection Progress for Meta OAuth */}
          {isConnecting && (
            <ConnectionProgress
              isConnecting={true}
              isConnected={false}
              platform="instagram"
              method="meta"
            />
          )}
        </>
      ) : showLoginForm ? (
        <>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={isConnecting}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={isConnecting}
              />
            </div>
            
            {requires2FA && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={isConnecting}
                  maxLength={6}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Check your authenticator app for the verification code
                </p>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {requires2FA ? 'Verifying...' : 'Connecting...'}
                </>
              ) : (
                requires2FA ? 'Verify' : 'Login'
              )}
            </button>
            
            <button
              onClick={() => {
                setShowLoginForm(false);
                setError(null);
              }}
              disabled={isConnecting}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
          
          {/* Connection Progress */}
          {isConnecting && !error && (
            <ConnectionProgress
              isConnecting={isConnecting}
              isConnected={false}
              platform="instagram"
              method="direct"
            />
          )}
          
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}
        </>
      ) : null}
      
      {error && !showLoginForm && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}
      
      {!showLoginForm && (
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>• Meta OAuth: Official API, safer for Business accounts</p>
          <p>• Direct Login: Works with Personal accounts</p>
          <p>• Supports Reels publishing up to 90 seconds</p>
        </div>
      )}
    </div>
  );
}
