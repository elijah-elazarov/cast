'use client';

import { useState, useEffect } from 'react';
import { Instagram, Youtube, Music, Sparkles, Shield, Zap, CheckCircle2, ArrowRight, ExternalLink, Star } from 'lucide-react';

interface ModernWelcomeFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

type Platform = 'instagram' | 'youtube' | 'tiktok' | null;

export default function ModernWelcomeFlow({ onComplete, onSkip }: ModernWelcomeFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(null);

  useEffect(() => {
    // Fade in animation
    setTimeout(() => setIsAnimating(false), 100);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep === 0) {
      // Move from welcome to platform selection
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(1);
      }, 200);
    } else if (currentStep === 1 && !selectedPlatform) {
      // User needs to select a platform first
      return;
    } else if (currentStep === 1 && selectedPlatform) {
      // Move to platform details
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(2);
      }, 200);
    } else if (currentStep === 2) {
      // Move to final step
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(3);
      }, 200);
    } else {
      onComplete();
    }
  };

  const handlePlatformSelect = (platform: Platform) => {
    setSelectedPlatform(platform);
    // Auto-advance after selection
    setTimeout(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(2);
      }, 200);
    }, 500);
  };

  const renderStepContent = () => {
    // Step 0: Welcome
    if (currentStep === 0) {
      return (
        <>
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-0.5 animate-[pulse_2s_ease-in-out_infinite]">
              <div className="w-full h-full bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Sparkles className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 bg-clip-text text-transparent" strokeWidth={2} />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
            Welcome to Cast
          </h2>

          <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
            Your all-in-one platform for publishing Reels, Shorts, and TikTok videos
          </p>

          <div className="flex items-center justify-center gap-2 mb-8 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-900 dark:text-purple-200">
              Post to multiple platforms with one upload
            </span>
          </div>
        </>
      );
    }

    // Step 1: Platform Selection
    if (currentStep === 1) {
      return (
        <>
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5">
              <div className="w-full h-full bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Shield className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 bg-clip-text text-transparent" strokeWidth={2} />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
            Choose Your Platform
          </h2>

          <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
            Select which platform you&apos;d like to connect first
          </p>

          <div className="space-y-3 mb-8">
            {/* Instagram Graph API Option */}
            <button
              onClick={() => handlePlatformSelect('instagram')}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left hover:scale-[1.02] ${
                selectedPlatform === 'instagram'
                  ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-pink-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Instagram className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Instagram Business
                    </h3>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">NEW 2025</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Official Instagram Graph API. Secure OAuth 2.0 for Business & Creator accounts.
                  </p>
                </div>
              </div>
            </button>

            {/* YouTube Option */}
            <button
              onClick={() => handlePlatformSelect('youtube')}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left hover:scale-[1.02] ${
                selectedPlatform === 'youtube'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0">
                  <Youtube className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    YouTube Shorts
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Connect your YouTube channel to publish Shorts and long-form content.
                  </p>
                </div>
              </div>
            </button>

            {/* TikTok Option */}
            <button
              onClick={() => handlePlatformSelect('tiktok')}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left hover:scale-[1.02] ${
                selectedPlatform === 'tiktok'
                  ? 'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-800 to-black flex items-center justify-center flex-shrink-0">
                  <Music className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    TikTok
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Connect your TikTok account to publish videos and reach your audience.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </>
      );
    }

    // Step 2: Platform-specific details
    if (currentStep === 2 && selectedPlatform) {
      const platformDetails = {
        instagram: {
          title: 'Instagram Graph API (2025)',
          description: 'The latest and most secure way to connect your Instagram Business account',
          features: [
            'Official Instagram Graph API',
            'Secure OAuth 2.0 authentication',
            'Business & Creator accounts only',
            'Upload and publish Reels',
            'Professional analytics access'
          ],
          requirements: 'Your Instagram account must be a Business or Creator account connected to a Facebook Page.',
          icon: Instagram,
          color: 'from-pink-500 to-purple-600'
        },
        youtube: {
          title: 'YouTube Shorts',
          description: 'Connect your YouTube channel to publish Shorts and long-form content',
          features: [
            'YouTube Data API v3',
            'Upload Shorts and long videos',
            'Access to channel analytics',
            'Monetization support',
            'Community features'
          ],
          requirements: 'You need a YouTube channel with content creation permissions.',
          icon: Youtube,
          color: 'from-red-500 to-red-600'
        },
        tiktok: {
          title: 'TikTok Content Publishing',
          description: 'Connect your TikTok account to publish videos and reach your audience',
          features: [
            'TikTok Content Posting API',
            'Upload and publish videos',
            'Access to TikTok analytics',
            'Creator tools access',
            'Community engagement'
          ],
          requirements: 'You need a TikTok account with content creation permissions.',
          icon: Music,
          color: 'from-gray-800 to-black'
        }
      };

      const details = platformDetails[selectedPlatform];
      const IconComponent = details.icon;

      return (
        <>
          <div className="mb-6 flex justify-center">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${details.color} p-0.5`}>
              <div className="w-full h-full bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                <IconComponent className={`w-10 h-10 bg-gradient-to-br ${details.color} bg-clip-text text-transparent`} strokeWidth={2} />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
            {details.title}
          </h2>

          <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
            {details.description}
          </p>

          <div className="space-y-3 mb-6">
            {details.features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Requirements:</strong> {details.requirements}
              </div>
            </div>
          </div>
        </>
      );
    }

    // Step 3: Final step
    if (currentStep === 3) {
      return (
        <>
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 p-0.5 animate-[pulse_2s_ease-in-out_infinite]">
              <div className="w-full h-full bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Zap className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 bg-clip-text text-transparent" strokeWidth={2} />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
            Ready to Publish!
          </h2>

          <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
            Once connected, you can upload videos and publish to Instagram, YouTube, and TikTok instantly
          </p>

          <div className="flex items-center justify-center gap-2 mb-8 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-900 dark:text-purple-200">
              Upload once, publish everywhere in seconds
            </span>
          </div>
        </>
      );
    }
  };

  const totalSteps = 4; // Welcome, Platform Selection, Platform Details, Final

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.3s_ease-out] overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden relative my-8">
        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
        >
          <span className="text-sm">Skip</span>
        </button>

        {/* Content */}
        <div className={`p-8 transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
          {renderStepContent()}

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {[...Array(totalSteps)].map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-8 bg-gradient-to-r from-purple-500 to-pink-500'
                    : index < currentStep
                    ? 'w-2 bg-green-500'
                    : 'w-2 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Action button */}
          {currentStep !== 1 && (
            <button
              onClick={handleNext}
              className="w-full py-3 px-6 rounded-lg font-medium text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {currentStep < totalSteps - 1 ? (
                <>
                  Next
                  <ArrowRight className="w-5 h-5" />
                </>
              ) : (
                <>
                  Get Started
                  <CheckCircle2 className="w-5 h-5" />
                </>
              )}
            </button>
          )}

          {/* Platform selection hint */}
          {currentStep === 1 && !selectedPlatform && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Select a platform above to continue
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
