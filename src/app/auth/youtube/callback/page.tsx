'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function YouTubeCallback() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`Authentication failed: ${error}`);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received');
          return;
        }

        // Exchange code for tokens
        const response = await fetch('/api/youtube/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage('Authentication successful! You can close this window.');
          
          // Send success message to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'YOUTUBE_AUTH_SUCCESS',
              authData: data.authData
            }, window.location.origin);
          }
        } else {
          setStatus('error');
          setMessage(`Authentication failed: ${data.error}`);
          
          // Send error message to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'YOUTUBE_AUTH_ERROR',
              error: data.error
            }, window.location.origin);
          }
        }
      } catch (error) {
        setStatus('error');
        setMessage(`Authentication error: ${error}`);
        
        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'YOUTUBE_AUTH_ERROR',
            error: error instanceof Error ? error.message : 'Unknown error'
          }, window.location.origin);
        }
      }
    };

    handleAuth();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="mb-4">
            {status === 'loading' && (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            )}
            {status === 'success' && (
              <div className="text-green-600 text-4xl">✓</div>
            )}
            {status === 'error' && (
              <div className="text-red-600 text-4xl">✗</div>
            )}
          </div>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {status === 'loading' && 'Authenticating...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Error'}
          </h2>
          
          <p className="text-gray-600 mb-4">{message}</p>
          
          {status === 'success' && (
            <p className="text-sm text-gray-500">
              You can close this window and return to the main application.
            </p>
          )}
          
          {status === 'error' && (
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Close Window
            </button>
          )}
        </div>
      </div>
    </div>
  );
}