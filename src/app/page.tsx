'use client';

import { useState, useEffect } from 'react';
import { Youtube, Music, TestTube } from 'lucide-react';
// import InstagramConnection from './components/InstagramConnection';
import InstagramOAuthConnection from './components/InstagramOAuthConnection';
import InstagramVideoUploader from './components/InstagramVideoUploader';
import YouTubeConnection from './components/YouTubeConnection';
import TikTokConnection from './components/TikTokConnection';
import ModernWelcomeFlow from './components/ModernWelcomeFlow';
// Legacy test tools removed: RealOAuthTest, RealInstagramTest, InstagramTestComponent, InstagramTestPopup, FreshInstagramAuth, EnhancedInstagramAuth, InstagramReelsPoster
import InstagramReelsDebugger from './components/InstagramReelsDebugger';
import YouTubeShortsDebugger from './components/YouTubeShortsDebugger';
import TikTokShortsDebugger from './components/TikTokShortsDebugger';
import UnifiedVideoUploader from './components/UnifiedVideoUploader';
import UnifiedUploaderAdvanced from './components/UnifiedUploaderAdvanced';
// import SimpleInstagramAuth from './components/SimpleInstagramAuth';

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
  const [showReelsDebugger, setShowReelsDebugger] = useState(false);
  const [showYouTubeShortsDebugger, setShowYouTubeShortsDebugger] = useState(false);
  const [showTikTokShortsDebugger, setShowTikTokShortsDebugger] = useState(false);
  const [showUnifiedUploader, setShowUnifiedUploader] = useState(false);
  const [showUnifiedAdvanced, setShowUnifiedAdvanced] = useState(false);
  const TOTAL_COUNTDOWN = 3;

  // Check localStorage on mount to initialize connected state
  useEffect(() => {
    const instagramUsername = localStorage.getItem('instagram_username');
    const youtubeUserId = localStorage.getItem('youtube_user_id');
    const tiktokUserId = localStorage.getItem('tiktok_user_id');
    const hasSeenOnboarding = localStorage.getItem('has_seen_onboarding');
    
    // Check for Instagram OAuth errors in URL
    
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
              onClick={() => setShowUnifiedUploader(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              🚀 Unified Uploader
            </button>
            <button
              onClick={() => setShowUnifiedAdvanced(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              🧪 Advanced Uploader
            </button>
            <button
              onClick={() => setShowReelsDebugger(true)}
              className="inline-flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm"
            >
              <TestTube className="w-4 h-4" />
              🔍 Reels Debugger
            </button>
            <button
              onClick={() => setShowYouTubeShortsDebugger(true)}
              className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              <Youtube className="w-4 h-4" />
              🎬 YouTube Shorts Debugger
            </button>
            <button
              onClick={() => setShowTikTokShortsDebugger(true)}
              className="inline-flex items-center gap-2 bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors text-sm"
            >
              <Music className="w-4 h-4" />
              🎵 TikTok Shorts Debugger
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

        {/* Legacy Instagram test components removed */}

        {/* Instagram Reels Debugger */}
        {showReelsDebugger && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                🔍 Instagram Reels Debugger
              </h2>
              <button
                onClick={() => setShowReelsDebugger(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Debug component to test Instagram Reels Poster authentication and check account details.
            </p>
            <InstagramReelsDebugger />
          </div>
        )}

        {/* YouTube Shorts Debugger */}
        {showYouTubeShortsDebugger && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                🎬 YouTube Shorts Debugger
              </h2>
              <button
                onClick={() => setShowYouTubeShortsDebugger(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Debug component to test YouTube Shorts upload authentication and video processing.
            </p>
            <YouTubeShortsDebugger />
          </div>
        )}

        {/* TikTok Shorts Debugger */}
        {showTikTokShortsDebugger && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                🎵 TikTok Shorts Debugger
              </h2>
              <button
                onClick={() => setShowTikTokShortsDebugger(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Debug component to test TikTok Shorts upload authentication and video processing.
            </p>
            <TikTokShortsDebugger />
          </div>
        )}

        {/* Fresh Instagram component removed */}
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

      {/* Legacy Instagram popup removed */}

      {showUnifiedUploader && (
        <UnifiedVideoUploader onClose={() => setShowUnifiedUploader(false)} />
      )}

      {showUnifiedAdvanced && (
        <UnifiedUploaderAdvanced onClose={() => setShowUnifiedAdvanced(false)} />
      )}
    </div>
  );
}

// Intentionally left blank (legacy debug console removed)
