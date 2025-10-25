'use client';

import { useState, useEffect } from 'react';
import { Instagram, Check, AlertCircle, ExternalLink } from 'lucide-react';

interface InstagramGraphConnectionProps {
  onConnect: (connected: boolean) => void;
}

interface AccountInfo {
  username: string;
  followers_count: number;
  media_count: number;
  account_type: string;
}

export default function InstagramGraphConnection({ onConnect }: InstagramGraphConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Check if user is already connected on component mount
  useEffect(() => {
    const checkConnection = () => {
      const storedUsername = localStorage.getItem('instagram_username');
      const storedAccountType = localStorage.getItem('instagram_account_type');
      
      if (storedUsername && storedAccountType === 'graph') {
        setIsConnected(true);
        onConnect(true);
        
        // Get stored account info
        const followersCount = localStorage.getItem('instagram_followers_count');
        const mediaCount = localStorage.getItem('instagram_media_count');
        
        setAccountInfo({
          username: storedUsername,
          followers_count: followersCount ? parseInt(followersCount) : 0,
          media_count: mediaCount ? parseInt(mediaCount) : 0,
          account_type: 'BUSINESS'
        });
      }
    };

    checkConnection();
  }, [onConnect]);

  // Check for OAuth callback success/error from query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const instagramConnected = urlParams.get('instagram_connected');
    const instagramError = urlParams.get('instagram_error');

    if (instagramConnected === 'true') {
      // Connection was successful, account info should be in localStorage
      const username = localStorage.getItem('instagram_username');
      const followersCount = localStorage.getItem('instagram_followers_count');
      const mediaCount = localStorage.getItem('instagram_media_count');
      
      if (username) {
        setIsConnected(true);
        setAccountInfo({
          username,
          followers_count: followersCount ? parseInt(followersCount) : 0,
          media_count: mediaCount ? parseInt(mediaCount) : 0,
          account_type: 'BUSINESS'
        });
        setShowSuccessAnimation(true);
        onConnect(true);
        
        // Clean up URL parameters
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    } else if (instagramError) {
      setError(`Instagram connection failed: ${instagramError}`);
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [onConnect]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Get Instagram Graph API auth URL
      const response = await fetch('/api/instagram/graph/auth-url');
      const data = await response.json();

      if (data.success) {
        // Open Instagram OAuth in a small popup window
        const popup = window.open(
          data.auth_url,
          'instagram-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no'
        );
        
        if (!popup) {
          throw new Error('Popup blocked. Please allow popups for this site.');
        }

        // Monitor the popup for completion
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            setIsConnecting(false);
            // Check if connection was successful by looking at localStorage
            setTimeout(() => {
              const username = localStorage.getItem('instagram_username');
              if (username) {
                setIsConnected(true);
                onConnect(true);
                setShowSuccessAnimation(true);
              }
            }, 1000);
          }
        }, 1000);

        // Listen for messages from the popup
        const messageHandler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'INSTAGRAM_OAUTH_SUCCESS') {
            clearInterval(checkClosed);
            popup.close();
            setIsConnecting(false);
            setIsConnected(true);
            onConnect(true);
            setShowSuccessAnimation(true);
            window.removeEventListener('message', messageHandler);
          } else if (event.data.type === 'INSTAGRAM_OAUTH_ERROR') {
            clearInterval(checkClosed);
            popup.close();
            setIsConnecting(false);
            setError(event.data.error || 'Instagram connection failed');
            window.removeEventListener('message', messageHandler);
          }
        };

        window.addEventListener('message', messageHandler);
      } else {
        throw new Error(data.error || 'Failed to get Instagram auth URL');
      }
    } catch (err) {
      console.error('Instagram connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to Instagram');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const userId = localStorage.getItem('instagram_user_id');
      
      if (userId) {
        // Logout from backend
        await fetch('/api/instagram/graph/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: userId }),
        });
      }

      // Clear localStorage
      localStorage.removeItem('instagram_user_id');
      localStorage.removeItem('instagram_username');
      localStorage.removeItem('instagram_account_type');
      localStorage.removeItem('instagram_followers_count');
      localStorage.removeItem('instagram_media_count');

      // Reset state
      setIsConnected(false);
      setAccountInfo(null);
      setShowSuccessAnimation(false);
      onConnect(false);
    } catch (err) {
      console.error('Instagram disconnect error:', err);
      setError('Failed to disconnect from Instagram');
    }
  };

  if (showSuccessAnimation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Instagram Connected!
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Welcome, @{accountInfo?.username}! Your Instagram Business account is now connected.
          </p>
          <button
            onClick={() => setShowSuccessAnimation(false)}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        </div>
      )}

      {!isConnected ? (
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 border border-pink-200 dark:border-gray-600">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Instagram className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Instagram Business Account
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Connect your Instagram Business or Creator account
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <Check className="w-4 h-4 text-green-500" />
              <span>Official Instagram Graph API</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <Check className="w-4 h-4 text-green-500" />
              <span>Secure OAuth 2.0 authentication</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <Check className="w-4 h-4 text-green-500" />
              <span>Upload and publish Reels</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <Check className="w-4 h-4 text-green-500" />
              <span>Professional business features</span>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Requirements:</strong> Your Instagram account must be a Business or Creator account connected to a Facebook Page.
              </div>
            </div>
          </div>

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Instagram className="w-4 h-4" />
                <span>Connect Instagram Account</span>
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 border border-green-200 dark:border-gray-600">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Instagram Connected
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  @{accountInfo?.username}
                </p>
              </div>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full text-xs font-medium">
              Business
            </div>
          </div>

          {accountInfo && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {accountInfo.followers_count.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {accountInfo.media_count.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Posts</div>
              </div>
            </div>
          )}

          <button
            onClick={handleDisconnect}
            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            Disconnect Instagram
          </button>
        </div>
      )}
    </div>
  );
}
