'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles, Instagram, Youtube, Music } from 'lucide-react';

interface ConnectionSuccessProps {
  platform: 'instagram' | 'youtube' | 'tiktok';
  username: string;
  onComplete: () => void;
}

export default function ConnectionSuccess({ platform, username, onComplete }: ConnectionSuccessProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 100);
    setTimeout(() => setShowConfetti(true), 300);
    
    // Auto-dismiss after 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const getPlatformConfig = () => {
    switch (platform) {
      case 'instagram':
        return {
          icon: Instagram,
          gradient: 'from-purple-500 via-pink-500 to-orange-400',
          name: 'Instagram'
        };
      case 'youtube':
        return {
          icon: Youtube,
          gradient: 'from-red-500 to-red-600',
          name: 'YouTube'
        };
      case 'tiktok':
        return {
          icon: Music,
          gradient: 'from-black to-gray-800',
          name: 'TikTok'
        };
    }
  };

  const config = getPlatformConfig();
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-[fall_2s_ease-out_forwards]"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                backgroundColor: ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981'][Math.floor(Math.random() * 4)],
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1.5 + Math.random()}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Success card */}
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center transition-all duration-500 ${
        isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
      }`}>
        {/* Success icon with pulse animation */}
        <div className="relative mb-6 flex justify-center">
          <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${config.gradient} opacity-20 animate-[ping_1.5s_ease-out_infinite]`} style={{ width: '120px', height: '120px', margin: 'auto' }} />
          <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${config.gradient} p-0.5`}>
            <div className="w-full h-full bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 animate-[scaleIn_0.5s_ease-out]" />
            </div>
          </div>
        </div>

        {/* Success message */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 animate-[slideUp_0.5s_ease-out_0.2s_both]">
          Successfully Connected!
        </h2>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4 animate-[slideUp_0.5s_ease-out_0.3s_both]">
          Your {config.name} account{' '}
          <span className="font-semibold text-gray-900 dark:text-white">@{username}</span>{' '}
          is now linked
        </p>

        {/* Platform icon */}
        <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg animate-[slideUp_0.5s_ease-out_0.4s_both]">
          <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-900 dark:text-green-200">
            You're ready to start posting!
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0) rotate(-180deg); }
          to { transform: scale(1) rotate(0deg); }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

