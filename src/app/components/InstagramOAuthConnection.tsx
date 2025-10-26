'use client';

import { useState, useEffect } from 'react';
import { Check, X, Instagram, Facebook, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';

interface InstagramOAuthConnectionProps {
  onConnect: (connected: boolean, accountInfo?: AccountInfo) => void;
}

interface AccountInfo {
  user_id: string;
  username: string;
  followers_count: number;
  media_count: number;
  profile_picture_url?: string;
  account_type: string;
}

export default function InstagramOAuthConnection({ onConnect }: InstagramOAuthConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Check if user is already connected on component mount
  useEffect(() => {
    checkExistingConnection();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle OAuth callback when component mounts
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (code) {
      console.log('[Instagram OAuth] Detected callback with code, processing...');
      handleOAuthCallback(code);
    } else if (error) {
      console.log('[Instagram OAuth] Detected OAuth error:', error);
      setError(`OAuth error: ${error}`);
      setIsConnecting(false);
    } else {
      // No callback parameters, reset connecting state
      setIsConnecting(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkExistingConnection = async () => {
    try {
      const storedAccountInfo = localStorage.getItem('instagram_account_info');
      if (storedAccountInfo) {
        const account = JSON.parse(storedAccountInfo);
        setAccountInfo(account);
        setIsConnected(true);
        onConnect(true, account);
      }
    } catch (error) {
      console.error('Error checking existing connection:', error);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      console.log('[Instagram OAuth] Processing callback with code:', code.substring(0, 10) + '...');
      
      // Exchange code for access token and get account info
      const response = await fetch('/api/instagram/meta/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.success) {
        const account = data.data;
        setAccountInfo(account);
        setIsConnected(true);
        setShowSuccessAnimation(true);
        
        // Store account info in localStorage
        localStorage.setItem('instagram_account_info', JSON.stringify(account));
        localStorage.setItem('instagram_username', account.username);
        localStorage.setItem('instagram_account_type', 'graph');
        
        onConnect(true, account);
        
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        
        console.log('[Instagram OAuth] Successfully connected:', account);
      } else {
        throw new Error(data.detail || 'Failed to connect to Instagram');
      }
    } catch (error) {
      console.error('[Instagram OAuth] Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to Instagram');
    } finally {
      setIsConnecting(false);
    }
  };

  const initiateOAuth = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      console.log('[Instagram OAuth] Getting auth URL...');
      
      const response = await fetch('/api/instagram/meta/auth-url', {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });

      const data = await response.json();

      if (data.success) {
        console.log('[Instagram OAuth] Redirecting to:', data.data.auth_url);
        
        // Set a timeout to reset connecting state if user doesn't return
        setTimeout(() => {
          if (isConnecting && !window.location.search.includes('code')) {
            console.log('[Instagram OAuth] Timeout - resetting connecting state');
            setIsConnecting(false);
          }
        }, 30000); // 30 second timeout
        
        // Redirect to Instagram OAuth
        window.location.href = data.data.auth_url;
      } else {
        throw new Error(data.detail || 'Failed to get auth URL');
      }
    } catch (error) {
      console.error('[Instagram OAuth] Error getting auth URL:', error);
      setError(error instanceof Error ? error.message : 'Failed to get auth URL');
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setAccountInfo(null);
    setShowSuccessAnimation(false);
    
    // Clear stored data
    localStorage.removeItem('instagram_account_info');
    localStorage.removeItem('instagram_username');
    localStorage.removeItem('instagram_account_type');
    
    onConnect(false);
  };

  if (isConnecting) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">Connecting to Instagram</h3>
            <p className="text-sm text-gray-600 mt-1">
              {window.location.search.includes('code') ? 'Processing authentication...' : 'Redirecting to Instagram...'}
            </p>
            {!window.location.search.includes('code') && (
              <button
                onClick={() => setIsConnecting(false)}
                className="mt-3 text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isConnected && accountInfo) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
              <Instagram className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">@{accountInfo.username}</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>{accountInfo.followers_count.toLocaleString()} followers</span>
                <span>{accountInfo.media_count.toLocaleString()} posts</span>
                <span className="capitalize">{accountInfo.account_type}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center text-green-600">
              <Check className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Connected</span>
            </div>
            <button
              onClick={disconnect}
              className="text-gray-400 hover:text-red-600 transition-colors"
              title="Disconnect"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {showSuccessAnimation && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm text-green-800">Successfully connected to Instagram!</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-4">
          <Instagram className="h-8 w-8 text-white" />
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Instagram</h3>
        <p className="text-gray-600 mb-6">
          Connect your Instagram Business account to post Reels and Stories directly from Cast.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={initiateOAuth}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Instagram className="h-5 w-5" />
            <span>Connect with Instagram</span>
            <ExternalLink className="h-4 w-4" />
          </button>

          <div className="text-xs text-gray-500">
            <div className="flex items-center justify-center space-x-1 mb-2">
              <Facebook className="h-4 w-4" />
              <span>Powered by Facebook OAuth</span>
            </div>
            <p>Requires Instagram Business account connected to Facebook Page</p>
          </div>
        </div>
      </div>
    </div>
  );
}
