'use client';

import { useState, useEffect, useCallback } from 'react';
import { Instagram, Check, AlertCircle, Loader2 } from 'lucide-react';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userInfo: {
    username: string;
    user_id: string;
    access_token: string;
    account_type: string;
  } | null;
}

export default function SimpleInstagramAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    userInfo: null
  });

  // Load saved state on component mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('instagram_auth_state');
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        setAuthState(parsed);
      } catch (e) {
        console.error('Failed to parse saved auth state:', e);
        localStorage.removeItem('instagram_auth_state');
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (authState.isAuthenticated && authState.userInfo) {
      localStorage.setItem('instagram_auth_state', JSON.stringify(authState));
    }
  }, [authState]);

  const startOAuthFlow = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get OAuth URL from backend
      const response = await fetch('/api/instagram/graph/auth-url');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get OAuth URL');
      }

      // Create popup URL that will handle the OAuth flow
      const popupUrl = `${data.auth_url}&redirect_uri=${encodeURIComponent(window.location.origin + '/instagram-popup')}`;
      
      // Open popup window
      const popup = window.open(
        popupUrl,
        'instagram-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for messages from popup
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'INSTAGRAM_OAUTH_SUCCESS') {
          // Success - update state
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            error: null,
            userInfo: {
              username: event.data.data.username,
              user_id: event.data.data.user_id,
              access_token: event.data.data.access_token,
              account_type: event.data.data.account_type || 'BUSINESS'
            }
          });
          
          popup.close();
          window.removeEventListener('message', messageHandler);
        } else if (event.data.type === 'INSTAGRAM_OAUTH_ERROR') {
          // Error - update state
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: event.data.error || 'OAuth failed'
          }));
          
          popup.close();
          window.removeEventListener('message', messageHandler);
        }
      };

      window.addEventListener('message', messageHandler);

      // Monitor popup closure
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }, 1000);

    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'OAuth flow failed'
      }));
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userInfo: null
    });
    localStorage.removeItem('instagram_auth_state');
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center mb-4">
        <Instagram className="w-8 h-8 text-pink-500 mr-3" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Instagram Authentication
        </h2>
      </div>

      {authState.isAuthenticated && authState.userInfo ? (
        <div className="text-center">
          <div className="flex items-center justify-center text-green-500 mb-4">
            <Check className="w-6 h-6 mr-2" />
            <span className="text-lg font-semibold">Connected!</span>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Username:</strong> @{authState.userInfo.username}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>User ID:</strong> {authState.userInfo.user_id}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Account Type:</strong> {authState.userInfo.account_type}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Access Token:</strong> {authState.userInfo.access_token.substring(0, 20)}...
            </p>
          </div>

          <button
            onClick={handleDisconnect}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 mx-auto"
          >
            <AlertCircle className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Connect your Instagram account to get started
          </p>

          <button
            onClick={startOAuthFlow}
            disabled={authState.isLoading}
            className={`bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600 transition-colors flex items-center gap-2 mx-auto ${
              authState.isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {authState.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Instagram className="w-4 h-4" />
                Connect Instagram
              </>
            )}
          </button>

          {authState.error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span className="text-sm">{authState.error}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
