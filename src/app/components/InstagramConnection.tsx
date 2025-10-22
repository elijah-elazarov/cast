'use client';

import { useState, useEffect } from 'react';
import { Check, X, InstagramIcon, AlertTriangle } from 'lucide-react';

interface InstagramConnectionProps {
  onConnect: (connected: boolean) => void;
}

interface AccountInfo {
  username: string;
  full_name: string;
  follower_count: number;
  media_count: number;
  profile_pic_url: string;
}

export default function InstagramConnection({ onConnect }: InstagramConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);

  // Check if user is already connected on component mount
  useEffect(() => {
    const checkConnection = () => {
      const storedUsername = localStorage.getItem('instagram_username');
      
      if (storedUsername) {
        setIsConnected(true);
        onConnect(true);
        // Fetch account info for connected users
        fetchAccountInfo(storedUsername);
      }
    };

    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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
        // Store username in localStorage
        localStorage.setItem('instagram_username', username);
        
        setIsConnected(true);
        onConnect(true);
        setShowLoginForm(false);
        setRequires2FA(false);
        setVerificationCode('');
        
        console.log('[IG] Step 8: Connected successfully');
        // Fetch account info after successful login
        fetchAccountInfo(username);
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
    
    if (username) {
      try {
        // Use Next.js API proxy to avoid mixed content issues
        await fetch('/api/instagram/logout', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify({ username }),
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    
    // Clear stored credentials
    localStorage.removeItem('instagram_username');
    
    setIsConnected(false);
    onConnect(false);
    setError(null);
    setAccountInfo(null);
    setShowLoginForm(false);
    setRequires2FA(false);
    setVerificationCode('');
    setUsername('');
    setPassword('');
  };

  if (isConnected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-green-700 dark:text-green-300 font-medium">
              Connected to Instagram
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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
              {accountInfo.follower_count.toLocaleString()} followers • {accountInfo.media_count} posts
            </p>
          </div>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your Instagram account is connected and ready for publishing Reels.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!showLoginForm ? (
        <>
          <button
            onClick={handleConnect}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center"
          >
            <InstagramIcon className="w-4 h-4 mr-2" />
            Connect Instagram
          </button>
          
          <div className="flex items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0" />
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              Uses Instagram direct authentication with Direct Login.
            </p>
          </div>
        </>
      ) : (
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
          
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}
        </>
      )}
      
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>• Supports all Instagram account types</p>
        <p>• No Facebook Developer account needed</p>
        <p>• Supports Reels publishing up to 90 seconds</p>
      </div>
    </div>
  );
}
