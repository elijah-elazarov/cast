'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function InstagramPopupHandler() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing Instagram authorization...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      // const state = searchParams.get('state');

      if (error) {
        setStatus('error');
        setMessage('Authorization was denied');
        
        // Send error to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'INSTAGRAM_OAUTH_ERROR',
            error: error
          }, window.location.origin);
        }
        
        setTimeout(() => window.close(), 2000);
        return;
      }

      if (code) {
        try {
          setMessage('Exchanging authorization code for access token...');
          
          // Exchange code for token (using Platform API)
          const response = await fetch('/api/instagram/platform/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
          });

          const data = await response.json();

          if (data.success) {
            setStatus('success');
            setMessage('Successfully connected! Closing window...');
            
            // Send success to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'INSTAGRAM_OAUTH_SUCCESS',
                data: data.data
              }, window.location.origin);
            }
            
            setTimeout(() => window.close(), 1500);
          } else {
            setStatus('error');
            setMessage(data.detail?.message || 'Failed to connect');
            
            // Send error to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'INSTAGRAM_OAUTH_ERROR',
                error: data.detail?.message || 'Instagram connection failed'
              }, window.location.origin);
            }
            
            setTimeout(() => window.close(), 2000);
          }
        } catch (err) {
          console.error('OAuth callback error:', err);
          setStatus('error');
          setMessage('An error occurred during connection');
          
          // Send error to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'INSTAGRAM_OAUTH_ERROR',
              error: 'An error occurred during connection'
            }, window.location.origin);
          }
          
          setTimeout(() => window.close(), 2000);
        }
      } else {
        // No code, close window
        window.close();
      }
    };

    handleOAuthCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            {status === 'processing' && (
              <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
            )}
            {status === 'success' && (
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {status === 'error' && (
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {status === 'processing' && 'Processing...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Error'}
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
