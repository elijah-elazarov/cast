'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function YouTubeCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing YouTube connection...');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage('Authorization was denied');
        setTimeout(() => {
          window.location.href = '/?youtube_error=denied';
        }, 2000);
        return;
      }

      if (code) {
        setStatus('processing');
        setMessage('Processing authorization...');
        
        try {
          const response = await fetch('/api/youtube/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true',
            },
            body: JSON.stringify({ code }),
          });

          const data = await response.json();

          if (data.success) {
            setStatus('success');
            setMessage('Connection successful! Redirecting...');
            
            // Store credentials
            localStorage.setItem('youtube_user_id', data.data.user_id);
            localStorage.setItem('youtube_channel_title', data.data.channel_title);
            
            // Redirect to home with success flag
            setTimeout(() => {
              window.location.href = '/?youtube_connected=true';
            }, 1000);
          } else {
            setStatus('error');
            setMessage('Failed to connect. Redirecting...');
            setTimeout(() => {
              window.location.href = '/?youtube_error=failed';
            }, 2000);
          }
        } catch (err) {
          console.error('YouTube login error:', err);
          setStatus('error');
          setMessage('An error occurred. Redirecting...');
          setTimeout(() => {
            window.location.href = '/?youtube_error=error';
          }, 2000);
        }
      } else {
        window.location.href = '/';
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center p-8">
        {status === 'loading' && (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
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
        <p className="text-gray-600 dark:text-gray-300">{message}</p>
      </div>
    </div>
  );
}

export default function YouTubeCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    }>
      <YouTubeCallbackContent />
    </Suspense>
  );
}
