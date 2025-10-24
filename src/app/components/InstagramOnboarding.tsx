'use client';

import { useState, useEffect } from 'react';
import { Instagram, Sparkles, Shield, Zap, CheckCircle2, ArrowRight, Facebook, KeyRound } from 'lucide-react';
import AuthPreview from './AuthPreview';

interface InstagramOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

type ConnectionMethod = 'meta' | 'direct' | null;

export default function InstagramOnboarding({ onComplete, onSkip }: InstagramOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<ConnectionMethod>(null);

  useEffect(() => {
    // Fade in animation
    setTimeout(() => setIsAnimating(false), 100);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep === 0) {
      // Move from welcome to method selection
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(1);
      }, 200);
    } else if (currentStep === 1 && !selectedMethod) {
      // User needs to select a method first
      return;
    } else if (currentStep === 1 && selectedMethod) {
      // Move to method details
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

  const handleMethodSelect = (method: ConnectionMethod) => {
    setSelectedMethod(method);
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
                <Instagram className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 bg-clip-text text-transparent" strokeWidth={2} />
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

    // Step 1: Method Selection
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
            Choose Your Connection Method
          </h2>

          <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
            Select how you&apos;d like to connect your Instagram account
          </p>

          <div className="space-y-3 mb-8">
            {/* Meta OAuth Option */}
            <button
              onClick={() => handleMethodSelect('meta')}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left hover:scale-[1.02] ${
                selectedMethod === 'meta'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Facebook className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Meta OAuth (Business)
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Official, secure. For Business & Creator accounts.
                  </p>
                </div>
              </div>
            </button>

            {/* Direct Login Option */}
            <button
              onClick={() => handleMethodSelect('direct')}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left hover:scale-[1.02] ${
                selectedMethod === 'direct'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Direct Login (Personal)
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Username & password. Works with all accounts.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </>
      );
    }

    // Step 2: Method-specific details with interactive preview
    if (currentStep === 2 && selectedMethod) {
      return (
        <>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
            {selectedMethod === 'meta' ? 'Meta OAuth Experience' : 'Direct Login Experience'}
          </h2>

          <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
            Preview what you&apos;ll actually see - click dots to navigate
          </p>

          <AuthPreview method={selectedMethod} />
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

  const totalSteps = 4; // Welcome, Method Selection, Method Details, Final

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

          {/* Method selection hint */}
          {currentStep === 1 && !selectedMethod && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Select a method above to continue
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

