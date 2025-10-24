'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function InstagramGraphCallbackContent() {
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
        setTimeout(() => {
          window.location.href = '/?instagram_error=denied';
        }, 2000);
        return;
      }

      if (code) {
        setStatus('processing');
        setMessage('Processing authorization...');
        
        try {
          const response = await fetch('/api/instagram/graph/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
          });

          const data = await response.json();

          if (data.success) {
            setStatus('success');
            setMessage('Connection successful! Redirecting...');
            
            // Store credentials and account info
            localStorage.setItem('instagram_user_id', data.data.user_id);
            localStorage.setItem('instagram_username', data.data.username);
            localStorage.setItem('instagram_account_type', 'graph'); // Indicate it's Graph API
            localStorage.setItem('instagram_followers_count', data.data.followers_count.toString());
            localStorage.setItem('instagram_media_count', data.data.media_count.toString());
            
            // Redirect to home with success flag
            setTimeout(() => {
              window.location.href = '/?instagram_connected=true';
            }, 1500);
          } else {
            setStatus('error');
            setMessage('Failed to connect. Redirecting...');
            setTimeout(() => {
              window.location.href = '/?instagram_error=failed';
            }, 2000);
          }
        } catch (err) {
          console.error('Instagram Graph login error:', err);
          setStatus('error');
          setMessage('An error occurred. Redirecting...');
          setTimeout(() => {
            window.location.href = '/?instagram_error=error';
          }, 2000);
        }
      } else {
        window.location.href = '/';
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center p-8">
        {status === 'loading' && (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
        )}
        {status === 'processing' && (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        )}
        {status === 'success' && (
          <div className="rounded-full h-12 w-12 bg-green-500 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {status === 'error' && (
          <div className="rounded-full h-12 w-12 bg-red-500 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
        
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {status === 'loading' && 'Connecting to Instagram...'}
          {status === 'processing' && 'Processing Authorization...'}
          {status === 'success' && 'Connected Successfully!'}
          {status === 'error' && 'Connection Failed'}
        </h2>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {message}
        </p>
        
        {status === 'processing' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              We're setting up your Instagram Business account connection. This may take a few moments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InstagramGraphCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    }>
      <InstagramGraphCallbackContent />
    </Suspense>
  );
}
