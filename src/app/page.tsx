'use client';

import { useState, useEffect } from 'react';
import { Youtube, Music, TestTube } from 'lucide-react';
// import InstagramConnection from './components/InstagramConnection';
import InstagramOAuthConnection from './components/InstagramOAuthConnection';
import InstagramVideoUploader from './components/InstagramVideoUploader';
import YouTubeConnection from './components/YouTubeConnection';
import TikTokConnection from './components/TikTokConnection';
import VideoUploader from './components/VideoUploader';
import ModernWelcomeFlow from './components/ModernWelcomeFlow';
import RealOAuthTest from './components/RealOAuthTest';
import RealInstagramTest from './components/RealInstagramTest';
import InstagramTestComponent from './components/InstagramTestComponent';
import InstagramTestPopup from './components/InstagramTestPopup';
import FreshInstagramAuth from './components/FreshInstagramAuth';
// import SimpleInstagramAuth from './components/SimpleInstagramAuth';
import { Suspense } from 'react';

export default function Home() {
  const [connectedAccounts, setConnectedAccounts] = useState({
    instagram: false,
    youtube: false,
    tiktok: false,
  });
  const [isHydrated, setIsHydrated] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showMainContent, setShowMainContent] = useState(false);
  const [isFadingToCountdown, setIsFadingToCountdown] = useState(false);
  const [isShowingComplete, setIsShowingComplete] = useState(false);
  const [isFadingToComplete, setIsFadingToComplete] = useState(false);
  const [showWelcomeFlow, setShowWelcomeFlow] = useState(false);
  const [showInstagramTest, setShowInstagramTest] = useState(false);
  const [showInstagramDebug, setShowInstagramDebug] = useState(false);
  const [showInstagramStepByStep, setShowInstagramStepByStep] = useState(false);
  const [showDebugConsole, setShowDebugConsole] = useState(false);
  const [showInstagramPopup, setShowInstagramPopup] = useState(false);
  const [showFreshInstagram, setShowFreshInstagram] = useState(false);
  const TOTAL_COUNTDOWN = 3;

  // Check localStorage on mount to initialize connected state
  useEffect(() => {
    const instagramUsername = localStorage.getItem('instagram_username');
    const youtubeUserId = localStorage.getItem('youtube_user_id');
    const tiktokUserId = localStorage.getItem('tiktok_user_id');
    const hasSeenOnboarding = localStorage.getItem('has_seen_onboarding');
    
    // Check for Instagram OAuth errors in URL
    const urlParams = new URLSearchParams(window.location.search);
    const instagramError = urlParams.get('instagram_error');
    if (instagramError) {
      setShowInstagramTest(true);
    }
    
    const initialConnectedAccounts = {
      instagram: !!instagramUsername,
      youtube: !!youtubeUserId,
      tiktok: !!tiktokUserId,
    };
    
    console.log('Initializing connected accounts:', initialConnectedAccounts);
    setConnectedAccounts(initialConnectedAccounts);
    
    // Show welcome flow for first-time users
    if (!hasSeenOnboarding && !instagramUsername && !youtubeUserId && !tiktokUserId) {
      // Show welcome flow after loading sequence
      setTimeout(() => {
        setShowWelcomeFlow(true);
      }, 13500); // After all loading animations (9s + 4s completion + 500ms buffer)
    }
    
    // Start unified progress system immediately
    const totalDuration = 9000; // 9 seconds total for loading
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + (100 / (totalDuration / 100)); // Smooth progress over 9 seconds
      });
    }, 100);
    
    // Phase timing
    setTimeout(() => {
      setIsHydrated(true);
    }, 2000); // Initial loading: 0-2s
    
    setTimeout(() => {
      setIsStarting(true);
    }, 2000); // Starting: 2-4s
    
    setTimeout(() => {
      setIsStarting(false);
      setIsLoading(true);
    }, 4000); // Loading: 4-6s
    
    setTimeout(() => {
      setIsLoading(false);
      // Start fade transition to countdown
      setIsFadingToCountdown(true);
      
      // After fade, show countdown
      setTimeout(() => {
        setCountdown(TOTAL_COUNTDOWN);
        setIsFadingToCountdown(false);
      }, 200); // 200ms fade duration (1.5x faster)
    }, 6000); // Preparing: 6-9s
    
    // After countdown completes (at 9s), start fade transition to completion
    setTimeout(() => {
      setIsFadingToComplete(true);
      
      // After fade, show completion icon for 4 seconds
      setTimeout(() => {
        setIsShowingComplete(true);
        setIsFadingToComplete(false);
        
        // After 4 seconds showing complete, fade out and show main content
        setTimeout(() => {
          setIsShowingComplete(false);
          setShowMainContent(true);
        }, 4000); // 4 seconds showing completion
      }, 200); // 200ms fade duration
    }, 9000); // Start after loading completes at 9s
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      // Don't trigger main content here - controlled by completion timing
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleAccountConnect = (platform: string, connected: boolean) => {
    setConnectedAccounts(prev => ({
      ...prev,
      [platform]: connected
    }));
  };

  // Show initial loading state for 2 seconds
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center opacity-0 animate-[fadeIn_0.35s_ease-in-out_forwards]">
          <div className="h-12 w-12 mx-auto mb-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
          <p className="text-gray-600 tabular-nums dark:text-gray-300 mb-4">Cast via LinkMe</p>
          {/* Progress bar */}
          <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden mx-auto">
            <div 
              className="h-full bg-purple-500 dark:bg-purple-400 transition-all duration-100"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <style dangerouslySetInnerHTML={{
            __html: `
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
            `
          }} />
        </div>
      </div>
    );
  }

  // Phase 1: Starting (2 seconds after hydration)
  if (isStarting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600 tabular-nums dark:text-gray-300 mb-4">Starting - {Math.round(progress)}%</p>
          {/* Progress bar */}
          <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden mx-auto">
            <div 
              className="h-full bg-purple-500 dark:bg-purple-400 transition-all duration-100"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  // Phase 2: Loading (2 seconds) with fade to countdown
  if (isLoading || isFadingToCountdown) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto mb-4 flex items-center justify-center relative">
            {/* Spinner fading out */}
            <div className={`absolute inset-0 animate-spin rounded-full border-b-2 border-purple-500 transition-all duration-500 ease-in-out ${isFadingToCountdown ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}></div>
            {/* Countdown "•" fading in */}
            <div className={`absolute inset-0 rounded-full border-2 border-purple-500 flex items-center justify-center text-purple-600 dark:text-purple-400 font-semibold transition-all duration-500 ease-in-out ${isFadingToCountdown ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
              <span className="leading-none tabular-nums text-lg">•</span>
            </div>
          </div>
          <p className="text-gray-600 tabular-nums dark:text-gray-300 mb-4 transition-all duration-500 ease-in-out">Loading - {Math.round(progress)}%</p>
          {/* Progress bar */}
          <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden mx-auto">
            <div 
              className="h-full bg-purple-500 dark:bg-purple-400 transition-all duration-100"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  // After loading, display countdown buffer with smooth transition to completion
  if (countdown > 0 || isFadingToComplete || isShowingComplete) {
    const showComplete = isShowingComplete || isFadingToComplete;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto mb-4 flex items-center justify-center relative">
            {/* Countdown icon fading out */}
            <div className={`absolute inset-0 rounded-full border-2 border-purple-500 flex items-center justify-center text-purple-600 dark:text-purple-400 font-semibold transition-all duration-500 ease-in-out ${showComplete ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
              <span className="leading-none tabular-nums text-lg">{countdown || 1}</span>
            </div>
            {/* Completion icon fading in */}
            <div className={`absolute inset-0 rounded-full border-2 border-green-500 flex items-center justify-center text-green-600 dark:text-green-400 font-semibold transition-all duration-500 ease-in-out ${showComplete ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
              <span className="leading-none tabular-nums text-lg">✓</span>
            </div>
          </div>
          <p className="text-gray-600 tabular-nums dark:text-gray-300 mb-4 transition-all duration-500 ease-in-out">
            {showComplete ? 'Complete' : 'Preparing'} - {Math.round(progress)}%
          </p>
          {/* Progress bar with color transition */}
          <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden mx-auto">
            <div
              className={`h-full transition-all duration-500 ease-in-out ${showComplete ? 'bg-green-500 dark:bg-green-400' : 'bg-purple-500 dark:bg-purple-400'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show main content until loading sequence is completely finished
  if (!showMainContent) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Cast
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            Connect your social accounts and publish content across platforms
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowInstagramTest(!showInstagramTest)}
              className="inline-flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              <TestTube className="w-4 h-4" />
              Quick Test
            </button>
            <button
              onClick={() => setShowInstagramDebug(!showInstagramDebug)}
              className="inline-flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm"
            >
              <TestTube className="w-4 h-4" />
              Real OAuth
            </button>
            <button
              onClick={() => setShowInstagramStepByStep(!showInstagramStepByStep)}
              className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              <TestTube className="w-4 h-4" />
              Step-by-Step
            </button>
            <button
              onClick={() => setShowDebugConsole(!showDebugConsole)}
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm"
            >
              <TestTube className="w-4 h-4" />
              Debug Console
            </button>
            <button
              onClick={() => setShowInstagramPopup(true)}
              className="inline-flex items-center gap-2 bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors text-sm"
            >
              <TestTube className="w-4 h-4" />
              Instagram Popup Test
            </button>
            <button
              onClick={() => setShowFreshInstagram(true)}
              className="inline-flex items-center gap-2 bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors text-sm"
            >
              <TestTube className="w-4 h-4" />
              Fresh Instagram Component
            </button>
          </div>
        </div>

        {/* Platform Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Instagram OAuth Card */}
          <div className="md:col-span-2">
            <InstagramOAuthConnection 
              onConnect={(connected) => handleAccountConnect('instagram', connected)}
            />
          </div>

          {/* YouTube Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <Youtube className="w-8 h-8 text-red-500 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                YouTube
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Connect your YouTube channel to publish Shorts
            </p>
            <YouTubeConnection 
              onConnect={(connected) => handleAccountConnect('youtube', connected)}
            />
          </div>

          {/* TikTok Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <Music className="w-8 h-8 text-black dark:text-white mr-3" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                TikTok
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Connect your TikTok account to publish videos
            </p>
            <TikTokConnection 
              onConnect={(connected) => handleAccountConnect('tiktok', connected)}
            />
          </div>
        </div>

        {/* Video Upload Section */}
        {connectedAccounts.instagram && (
          <div className="mb-8">
            <InstagramVideoUploader 
              isConnected={connectedAccounts.instagram}
              accountInfo={JSON.parse(localStorage.getItem('instagram_account_info') || '{}')}
            />
          </div>
        )}

        {/* Instagram Test Components */}
        {showInstagramTest && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                ⚡ Quick Instagram Test
              </h2>
              <button
                onClick={() => setShowInstagramTest(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Quick automated test of Instagram Graph API connectivity and backend health.
            </p>
            <RealInstagramTest />
          </div>
        )}

        {showInstagramDebug && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                🎯 Real Instagram OAuth Flow
              </h2>
              <button
                onClick={() => setShowInstagramDebug(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Complete real OAuth flow to get actual access tokens for posting to Instagram.
            </p>
            <Suspense fallback={<div>Loading OAuth test...</div>}>
              <RealOAuthTest />
            </Suspense>
          </div>
        )}

        {showInstagramStepByStep && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                🔧 Step-by-Step Instagram Test
              </h2>
              <button
                onClick={() => setShowInstagramStepByStep(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Manual step-by-step testing of Instagram Graph API components.
            </p>
            <InstagramTestComponent />
          </div>
        )}

        {showDebugConsole && (
          <DebugConsole onClose={() => setShowDebugConsole(false)} />
        )}

        {/* Fresh Instagram Component */}
        {showFreshInstagram && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                🚀 Fresh Instagram Component
              </h2>
              <button
                onClick={() => setShowFreshInstagram(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Brand new Instagram authentication component built from scratch using Facebook's manual OAuth flow.
            </p>
            <FreshInstagramAuth />
          </div>
        )}

        {/* Video Upload Section */}
        {(connectedAccounts.instagram || connectedAccounts.youtube || connectedAccounts.tiktok) ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Upload Video Content
            </h2>
            <VideoUploader connectedAccounts={connectedAccounts} />
          </div>
        ) : null}
      </div>

      {/* Modern Welcome Flow Modal */}
      {showWelcomeFlow && (
        <ModernWelcomeFlow
          onComplete={() => {
            setShowWelcomeFlow(false);
            localStorage.setItem('has_seen_onboarding', 'true');
          }}
          onSkip={() => {
            setShowWelcomeFlow(false);
            localStorage.setItem('has_seen_onboarding', 'true');
          }}
        />
      )}
    </div>
  );
}

// Debug Console Component
function DebugConsole({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState('');

  const testInstagramStatus = async () => {
    setStatus('loading');
    setError(null);
    setResults(null);

    try {
      const response = await fetch('https://backrooms-e8nm.onrender.com/api/debug/instagram/status');
      const data = await response.json();
      
      setResults(data);
      setStatus(data.success ? 'success' : 'error');
      if (!data.success) {
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to test Instagram status');
    }
  };

  const testAccessToken = async () => {
    if (!accessToken.trim()) {
      setError('Please enter an access token');
      return;
    }

    setStatus('loading');
    setError(null);
    setResults(null);

    try {
      const response = await fetch('https://backrooms-e8nm.onrender.com/api/debug/instagram/test-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: accessToken }),
      });
      
      const data = await response.json();
      
      setResults(data);
      setStatus(data.success ? 'success' : 'error');
      if (!data.success) {
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to test access token');
    }
  };

  const getOAuthUrl = async () => {
    setStatus('loading');
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/instagram/meta/auth-url');
      const data = await response.json();
      
      if (data.success) {
        setResults({
          success: true,
          message: 'OAuth URL generated successfully',
          auth_url: data.data.auth_url,
          state: data.data.state
        });
        setStatus('success');
      } else {
        setStatus('error');
        setError(data.detail || 'Failed to get OAuth URL');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to get OAuth URL');
    }
  };

  const reset = () => {
    setStatus('idle');
    setResults(null);
    setError(null);
    setAccessToken('');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          🔧 Instagram Debug Console
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Test 1: Instagram Status */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Test 1: Instagram API Status</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Check if Instagram Graph API is properly configured</p>
          <button
            onClick={testInstagramStatus}
            disabled={status === 'loading'}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
          >
            {status === 'loading' ? '⏳' : '🔄'}
            Test Instagram Status
          </button>
        </div>

        {/* Test 2: OAuth URL Generation */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Test 2: OAuth URL Generation</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Test if OAuth URL can be generated (frontend proxy test)</p>
          <button
            onClick={getOAuthUrl}
            disabled={status === 'loading'}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
          >
            {status === 'loading' ? '⏳' : '🔄'}
            Test OAuth URL
          </button>
        </div>

        {/* Test 3: Access Token Test */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Test 3: Access Token Test</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Test a specific access token and get detailed information</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Access Token
              </label>
              <input
                type="text"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Enter access token to test..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <button
              onClick={testAccessToken}
              disabled={status === 'loading' || !accessToken.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              {status === 'loading' ? '⏳' : '🔄'}
              Test Access Token
            </button>
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex justify-center">
          <button
            onClick={reset}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Reset All Tests
          </button>
        </div>

        {/* Results Display */}
        {status !== 'idle' && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              {status === 'loading' && '⏳'}
              {status === 'success' && '✅'}
              {status === 'error' && '❌'}
              Test Results
            </h4>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <div className="flex items-center">
                  <span className="text-sm text-red-800">⚠️ {error}</span>
                </div>
              </div>
            )}

            {results && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">How to Use</h4>
          <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200">
            <li><strong>Test 1:</strong> Click &quot;Test Instagram Status&quot; to check if your backend is properly configured</li>
            <li><strong>Test 2:</strong> Click &quot;Test OAuth URL&quot; to verify the frontend proxy is working</li>
            <li><strong>Test 3:</strong> Get an access token by completing the OAuth flow, then paste it here to test</li>
            <li>Check the results to see exactly what&apos;s working and what&apos;s not</li>
          </ol>
        </div>
      </div>

      {/* Instagram Test Popup */}
      <InstagramTestPopup 
        isOpen={showInstagramPopup} 
        onClose={() => setShowInstagramPopup(false)} 
      />
    </div>
  );
}
