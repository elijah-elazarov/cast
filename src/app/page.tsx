'use client';

import { useState, useEffect } from 'react';
import { Youtube, Music, TestTube, Key } from 'lucide-react';
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
import TokenManager from './components/TokenManager';
// import SimpleInstagramAuth from './components/SimpleInstagramAuth';

type InstagramAccountSummary = { username: string; followers_count?: number; profile_picture_url?: string };
type YouTubeChannelSummary = { channel_title: string; subscriber_count?: string | number; thumbnail_url?: string };
type TikTokAccountSummary = { username?: string; display_name?: string; follower_count?: string; avatar_url?: string };

export default function Home() {
  const [connectedAccounts, setConnectedAccounts] = useState({
    instagram: false,
    youtube: false,
    tiktok: false,
  });
  const [accountInfo, setAccountInfo] = useState<{
    instagram?: InstagramAccountSummary;
    youtube?: YouTubeChannelSummary;
    tiktok?: TikTokAccountSummary;
  }>({});
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
  const [showTokenManager, setShowTokenManager] = useState(false);
  const TOTAL_COUNTDOWN = 3;

  // Check localStorage on mount to initialize connected state (no auto-login)
  useEffect(() => {
    // Don't auto-connect from localStorage - require manual connection
    // const instagramUsername = localStorage.getItem('instagram_username');
    // const youtubeUserId = localStorage.getItem('youtube_user_id');
    // const tiktokUserId = localStorage.getItem('tiktok_user_id');
    const hasSeenOnboarding = localStorage.getItem('has_seen_onboarding');
    
    // Check for Instagram OAuth errors in URL
    
    const initialConnectedAccounts = {
      instagram: false, // Don't auto-connect Instagram
      youtube: false, // Don't auto-connect YouTube
      tiktok: false, // Don't auto-connect TikTok
    };
    
    console.log('Initializing connected accounts:', initialConnectedAccounts);
    setConnectedAccounts(initialConnectedAccounts);
    
    // Show welcome flow for first-time users (no auto-connect check needed)
    if (!hasSeenOnboarding) {
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

  const handleAccountConnect = (
    platform: 'instagram' | 'youtube' | 'tiktok',
    connected: boolean,
    info?: InstagramAccountSummary | YouTubeChannelSummary | TikTokAccountSummary
  ) => {
    setConnectedAccounts(prev => ({
      ...prev,
      [platform]: connected
    }));
    
    // Update account info when connected
    if (connected && info) {
      if (platform === 'instagram' && (info as InstagramAccountSummary).username) {
        setAccountInfo(prev => ({
          ...prev,
          instagram: {
            username: (info as InstagramAccountSummary).username,
            followers_count: (info as InstagramAccountSummary).followers_count,
            profile_picture_url: (info as InstagramAccountSummary).profile_picture_url
          }
        }));
      } else if (platform === 'youtube') {
        // YouTube info comes from localStorage
        const channelTitle = localStorage.getItem('youtube_channel_title');
        const subscriberCount = localStorage.getItem('youtube_subscriber_count');
        const thumbnailUrl = localStorage.getItem('youtube_thumbnail_url');
        if (channelTitle) {
          setAccountInfo(prev => ({
            ...prev,
            youtube: {
              channel_title: channelTitle,
              subscriber_count: subscriberCount || undefined,
              thumbnail_url: thumbnailUrl || undefined
            }
          }));
        }
      } else if (platform === 'tiktok') {
        // TikTok info comes from localStorage
        const username = localStorage.getItem('tiktok_username');
        const displayName = localStorage.getItem('tiktok_display_name');
        const followerCount = localStorage.getItem('tiktok_follower_count');
        const avatarUrl = localStorage.getItem('tiktok_avatar_url');
        if (displayName || username) {
          setAccountInfo(prev => ({
            ...prev,
            tiktok: {
              username: username || undefined,
              display_name: displayName || undefined,
              follower_count: followerCount || undefined,
              avatar_url: avatarUrl || undefined
            }
          }));
        }
      }
    } else if (!connected) {
      // Clear account info when disconnected
      setAccountInfo(prev => {
        const updated = { ...prev };
        delete updated[platform as keyof typeof updated];
        return updated;
      });
    }
  };

  // Sync account info from localStorage on mount and when storage changes
  useEffect(() => {
    const syncAccountInfo = () => {
      // Instagram
      const igUsername = localStorage.getItem('instagram_username');
      const igAccountInfo = localStorage.getItem('instagram_account_info');
      if (igUsername && igAccountInfo) {
        try {
          const info = JSON.parse(igAccountInfo);
          setAccountInfo(prev => ({
            ...prev,
            instagram: {
              username: info.username || igUsername,
              followers_count: info.followers_count,
              profile_picture_url: info.profile_picture_url
            }
          }));
          // Also mark as connected if we have account info
          setConnectedAccounts(prev => ({ ...prev, instagram: true }));
        } catch {}
      }
      
      // YouTube
      const ytChannelTitle = localStorage.getItem('youtube_channel_title');
      if (ytChannelTitle) {
        setAccountInfo(prev => ({
          ...prev,
          youtube: {
            channel_title: ytChannelTitle,
            subscriber_count: localStorage.getItem('youtube_subscriber_count') || undefined,
            thumbnail_url: localStorage.getItem('youtube_thumbnail_url') || undefined
          }
        }));
        // Also mark as connected if we have channel info
        setConnectedAccounts(prev => ({ ...prev, youtube: true }));
      }
      
      // TikTok
      const ttUsername = localStorage.getItem('tiktok_username');
      const ttDisplayName = localStorage.getItem('tiktok_display_name');
      if (ttDisplayName || ttUsername) {
        setAccountInfo(prev => ({
          ...prev,
          tiktok: {
            username: ttUsername || undefined,
            display_name: ttDisplayName || undefined,
            follower_count: localStorage.getItem('tiktok_follower_count') || undefined,
            avatar_url: localStorage.getItem('tiktok_avatar_url') || undefined
          }
        }));
        // Also mark as connected if we have account info
        setConnectedAccounts(prev => ({ ...prev, tiktok: true }));
      }
    };
    
    syncAccountInfo();
    
    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      // Only sync if the key is relevant
      if (e.key && (e.key.startsWith('instagram_') || e.key.startsWith('youtube_') || e.key.startsWith('tiktok_'))) {
        syncAccountInfo();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
            <button
              onClick={() => setShowTokenManager(true)}
              className="inline-flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm"
            >
              <Key className="w-4 h-4" />
              🔑 Token Manager
            </button>
          </div>
        </div>

        {/* Platform Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 justify-items-center">
          {/* Instagram OAuth Card (match width of YouTube/TikTok) */}
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-purple-500 mr-3">
                <path d="M7.5 2.25h9a5.25 5.25 0 0 1 5.25 5.25v9a5.25 5.25 0 0 1-5.25 5.25h-9A5.25 5.25 0 0 1 2.25 16.5v-9A5.25 5.25 0 0 1 7.5 2.25zm0 1.5A3.75 3.75 0 0 0 3.75 7.5v9A3.75 3.75 0 0 0 7.5 20.25h9A3.75 3.75 0 0 0 20.25 16.5v-9A3.75 3.75 0 0 0 16.5 3.75h-9z" />
                <path d="M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 1.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM17.25 6.75a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5z" />
              </svg>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Instagram
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Connect your Instagram (Meta) account to publish Reels and Stories
            </p>
            {connectedAccounts.instagram && accountInfo.instagram ? (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center gap-2">
                  {accountInfo.instagram.profile_picture_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={accountInfo.instagram.profile_picture_url} 
                      alt="" 
                      className="w-8 h-8 rounded-full" 
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <div>@{accountInfo.instagram.username}</div>
                    {accountInfo.instagram.followers_count !== undefined && (
                      <div className="text-xs text-gray-500">{accountInfo.instagram.followers_count.toLocaleString()} followers</div>
                    )}
                  </div>
                </div>
                <InstagramOAuthConnection 
                  onConnect={(connected, info) => handleAccountConnect('instagram', connected, info)}
                  embedded
                />
              </div>
            ) : (
            <InstagramOAuthConnection 
                onConnect={(connected, info) => handleAccountConnect('instagram', connected, info)}
                embedded
            />
            )}
          </div>

          {/* YouTube Card */}
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <Youtube className="w-10 h-10 text-red-500 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                YouTube
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Connect your YouTube channel to publish Shorts
            </p>
            {connectedAccounts.youtube && accountInfo.youtube ? (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center gap-2">
                  {accountInfo.youtube.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={accountInfo.youtube.thumbnail_url} 
                      alt="" 
                      className="w-8 h-8 rounded-full" 
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <div>{accountInfo.youtube.channel_title}</div>
                    {accountInfo.youtube.subscriber_count !== undefined && (
                      <div className="text-xs text-gray-500">{Number(accountInfo.youtube.subscriber_count).toLocaleString()} subscribers</div>
                    )}
                  </div>
                </div>
            <YouTubeConnection 
              onConnect={(connected, info) => handleAccountConnect('youtube', connected, info)}
            />
              </div>
            ) : (
              <YouTubeConnection 
                onConnect={(connected) => handleAccountConnect('youtube', connected)}
              />
            )}
          </div>

          {/* TikTok Card */}
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <Music className="w-10 h-10 text-black dark:text-white mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                TikTok
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Connect your TikTok account to publish videos
            </p>
            {connectedAccounts.tiktok && accountInfo.tiktok ? (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center gap-2">
                  {accountInfo.tiktok.avatar_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={accountInfo.tiktok.avatar_url} 
                      alt="" 
                      className="w-8 h-8 rounded-full" 
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <div>{accountInfo.tiktok.username || accountInfo.tiktok.display_name}</div>
                    {accountInfo.tiktok.follower_count && (
                      <div className="text-xs text-gray-500">{parseInt(accountInfo.tiktok.follower_count).toLocaleString()} followers</div>
                    )}
                  </div>
                </div>
            <TikTokConnection 
              onConnect={(connected, info) => handleAccountConnect('tiktok', connected, info)}
            />
              </div>
            ) : (
              <TikTokConnection 
                onConnect={(connected) => handleAccountConnect('tiktok', connected)}
              />
            )}
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

      {/* Token Manager */}
      {showTokenManager && (
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              🔑 Token Manager
        </h2>
        <button
              onClick={() => setShowTokenManager(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Manage and validate authentication tokens for all platforms.
          </p>
          <TokenManager />
          </div>
        )}
    </div>
  );
}

// Intentionally left blank (legacy debug console removed)
