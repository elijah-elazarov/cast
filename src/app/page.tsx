'use client';

import { useState, useEffect } from 'react';
import { Instagram, Youtube, Music } from 'lucide-react';
import InstagramConnection from './components/InstagramConnection';
import YouTubeConnection from './components/YouTubeConnection';
import TikTokConnection from './components/TikTokConnection';
import VideoUploader from './components/VideoUploader';

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
  const TOTAL_COUNTDOWN = 3;

  // Check localStorage on mount to initialize connected state
  useEffect(() => {
    const instagramUsername = localStorage.getItem('instagram_username');
    const youtubeUserId = localStorage.getItem('youtube_user_id');
    const tiktokUserId = localStorage.getItem('tiktok_user_id');
    
    const initialConnectedAccounts = {
      instagram: !!instagramUsername,
      youtube: !!youtubeUserId,
      tiktok: !!tiktokUserId,
    };
    
    console.log('Initializing connected accounts:', initialConnectedAccounts);
    setConnectedAccounts(initialConnectedAccounts);
    
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
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Connect your social accounts and publish content across platforms
          </p>
        </div>

        {/* Platform Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Instagram Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <Instagram className="w-8 h-8 text-pink-500 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Instagram
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Connect your Instagram account to publish Reels
            </p>
            <InstagramConnection 
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
        {(connectedAccounts.instagram || connectedAccounts.youtube || connectedAccounts.tiktok) ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Upload Video Content
            </h2>
            <VideoUploader connectedAccounts={connectedAccounts} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
