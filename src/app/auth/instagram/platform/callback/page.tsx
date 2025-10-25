'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function InstagramPlatformCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing Instagram connection...');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage('Authorization was denied');
        
        // Check if we're in a popup window
        if (window.opener) {
          // Send error message to parent window
          window.opener.postMessage({
            type: 'INSTAGRAM_PLATFORM_OAUTH_ERROR',
            error: error
          }, window.location.origin);
          
          // Close the popup after a short delay
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          // Regular redirect if not in popup
          setTimeout(() => {
            window.location.href = '/?instagram_error=denied';
          }, 2000);
        }
        return;
      }

      if (code) {
        setStatus('processing');
        setMessage('Processing authorization...');
        
        try {
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
            setMessage('Connection successful! Closing window...');
            
            // Store credentials and account info
            localStorage.setItem('instagram_user_id', data.data.user_id);
            localStorage.setItem('instagram_username', data.data.username);
            localStorage.setItem('instagram_account_type', 'platform'); // Indicate it's Platform API
            localStorage.setItem('instagram_followers_count', data.data.followers_count.toString());
            localStorage.setItem('instagram_media_count', data.data.media_count.toString());
            
            // Check if we're in a popup window
            if (window.opener) {
              // Send success message to parent window
              window.opener.postMessage({
                type: 'INSTAGRAM_PLATFORM_OAUTH_SUCCESS',
                data: data.data
              }, window.location.origin);
              
              // Close the popup after a short delay
              setTimeout(() => {
                window.close();
              }, 1500);
            } else {
              // Regular redirect if not in popup
              setTimeout(() => {
                window.location.href = '/?instagram_connected=true';
              }, 1500);
            }
          } else {
            setStatus('error');
            // Check if we have detailed error information
            if (data.detail && typeof data.detail === 'object') {
              setMessage(data.detail.message || 'Failed to connect. Closing window...');
            } else {
              setMessage('Failed to connect. Closing window...');
            }
            
            // Check if we're in a popup window
            if (window.opener) {
              // Send error message to parent window
              window.opener.postMessage({
                type: 'INSTAGRAM_PLATFORM_OAUTH_ERROR',
                error: data.detail?.message || 'Instagram connection failed'
              }, window.location.origin);
              
              // Close the popup after a short delay
              setTimeout(() => {
                window.close();
              }, 2000);
            } else {
              // Regular redirect if not in popup
              setTimeout(() => {
                window.location.href = '/?instagram_error=failed';
              }, 2000);
            }
          }
        } catch (err) {
          console.error('Instagram Platform login error:', err);
          setStatus('error');
          
          // Try to extract error message from response
          let errorMessage = 'An error occurred.';
          if (err instanceof Response) {
            try {
              const errorData = await err.json();
              if (errorData.detail && typeof errorData.detail === 'object') {
                errorMessage = errorData.detail.message || 'An error occurred.';
              }
            } catch {
              errorMessage = 'An error occurred.';
            }
          }
          
          setMessage(errorMessage + (window.opener ? ' Closing window...' : ' Redirecting...'));
          
          // Check if we're in a popup window
          if (window.opener) {
            // Send error message to parent window
            window.opener.postMessage({
              type: 'INSTAGRAM_PLATFORM_OAUTH_ERROR',
              error: errorMessage
            }, window.location.origin);
            
            // Close the popup after a short delay
            setTimeout(() => {
              window.close();
            }, 2000);
          } else {
            // Regular redirect if not in popup
            setTimeout(() => {
              window.location.href = '/?instagram_error=error';
            }, 2000);
          }
        }
      } else {
        window.location.href = '/';
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            {status === 'loading' && (
              <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
            )}
            {status === 'processing' && (
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
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
            {status === 'loading' && 'Loading...'}
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

export default function InstagramPlatformCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    }>
      <InstagramPlatformCallbackContent />
    </Suspense>
  );
}
