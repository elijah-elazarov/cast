'use client';

import { useState } from 'react';
import InstagramReelsDebugger from './InstagramReelsDebugger';
import YouTubeShortsDebugger from './YouTubeShortsDebugger';
import TikTokShortsDebugger from './TikTokShortsDebugger';

export default function UnifiedUploaderAdvanced({ onClose }: { onClose?: () => void }) {
  const [tab, setTab] = useState<'instagram' | 'youtube' | 'tiktok'>('instagram');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-5xl bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <span className="text-xl font-semibold text-gray-900 dark:text-white">🚀 Unified Video Uploader (Advanced)</span>
          <span className="ml-auto text-xs text-gray-500">Powered by the 3 debuggers</span>
          {onClose && (
            <button onClick={onClose} className="ml-3 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button>
          )}
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button onClick={() => setTab('instagram')} className={`px-4 py-2 text-sm ${tab==='instagram' ? 'bg-purple-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300'}`}>Instagram</button>
            <button onClick={() => setTab('youtube')} className={`px-4 py-2 text-sm ${tab==='youtube' ? 'bg-red-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300'}`}>YouTube</button>
            <button onClick={() => setTab('tiktok')} className={`px-4 py-2 text-sm ${tab==='tiktok' ? 'bg-yellow-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300'}`}>TikTok</button>
          </div>
        </div>

        <div className="p-6">
          {tab === 'instagram' && <InstagramReelsDebugger />}
          {tab === 'youtube' && <YouTubeShortsDebugger />}
          {tab === 'tiktok' && <TikTokShortsDebugger />}
        </div>
      </div>
    </div>
  );
}


