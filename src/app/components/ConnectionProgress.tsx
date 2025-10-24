'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

interface ConnectionProgressProps {
  isConnecting: boolean;
  isConnected: boolean;
  platform: 'instagram' | 'youtube' | 'tiktok';
  method?: 'meta' | 'direct' | 'oauth';
}

export default function ConnectionProgress({ 
  isConnecting, 
  isConnected, 
  platform,
  method = 'oauth'
}: ConnectionProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const getSteps = () => {
    if (platform === 'instagram' && method === 'meta') {
      return [
        { label: 'Initializing', duration: 500 },
        { label: 'Redirecting to Meta', duration: 1000 },
        { label: 'Authorizing', duration: 1500 },
        { label: 'Connecting account', duration: 1000 },
        { label: 'Complete', duration: 500 }
      ];
    } else if (platform === 'instagram' && method === 'direct') {
      return [
        { label: 'Validating credentials', duration: 800 },
        { label: 'Authenticating', duration: 1200 },
        { label: 'Securing connection', duration: 800 },
        { label: 'Complete', duration: 500 }
      ];
    } else {
      return [
        { label: 'Initializing OAuth', duration: 500 },
        { label: 'Redirecting', duration: 1000 },
        { label: 'Authorizing', duration: 1500 },
        { label: 'Complete', duration: 500 }
      ];
    }
  };

  const steps = getSteps();

  useEffect(() => {
    if (!isConnecting) {
      if (isConnected) {
        setCurrentStep(steps.length - 1);
      } else {
        setCurrentStep(0);
      }
      return;
    }

    const currentIndex = 0;
    const timers: NodeJS.Timeout[] = [];

    const scheduleSteps = () => {
      let totalDelay = 0;
      steps.forEach((step, index) => {
        const timer = setTimeout(() => {
          setCurrentStep(index);
        }, totalDelay);
        timers.push(timer);
        totalDelay += step.duration;
      });
    };

    scheduleSteps();

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [isConnecting, isConnected]);

  if (!isConnecting && !isConnected) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3 p-4 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-lg border border-purple-200/50 dark:border-purple-700/50 animate-[slideIn_0.3s_ease-out]">
      {steps.map((step, index) => {
        const isComplete = index < currentStep || isConnected;
        const isActive = index === currentStep && isConnecting;
        const isPending = index > currentStep;

        return (
          <div
            key={index}
            className={`flex items-center gap-3 transition-all duration-300 ${
              isActive ? 'scale-105' : 'scale-100'
            } ${isPending ? 'opacity-40' : 'opacity-100'}`}
          >
            {/* Icon */}
            <div className="relative">
              {isComplete ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 animate-[scaleIn_0.3s_ease-out]" />
              ) : isActive ? (
                <Loader2 className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-spin" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
              )}
              
              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div className={`absolute left-1/2 top-full w-0.5 h-6 -ml-px transition-all duration-500 ${
                  isComplete ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`} />
              )}
            </div>

            {/* Label */}
            <span className={`text-sm font-medium transition-colors ${
              isActive 
                ? 'text-purple-900 dark:text-purple-200' 
                : isComplete 
                ? 'text-green-700 dark:text-green-300'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {step.label}
            </span>

            {/* Active indicator */}
            {isActive && (
              <div className="ml-auto">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '200ms' }} />
                  <div className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            )}
          </div>
        );
      })}

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

