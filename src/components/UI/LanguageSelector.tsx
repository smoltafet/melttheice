"use client";

import { useState } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { motion, AnimatePresence } from 'framer-motion';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed top-6 left-6 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 transition-all shadow-lg"
      >
        <Globe size={24} className="text-white" />
        <span className="text-white text-base font-semibold">
          {language === 'en' ? 'English' : 'Español'}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-200 overflow-hidden min-w-[160px]"
          >
            <button
              onClick={() => {
                setLanguage('en');
                setIsOpen(false);
              }}
              className={`w-full px-5 py-3 text-left hover:bg-gray-100 transition-colors text-base ${
                language === 'en' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
              }`}
            >
              English
            </button>
            <button
              onClick={() => {
                setLanguage('es');
                setIsOpen(false);
              }}
              className={`w-full px-5 py-3 text-left hover:bg-gray-100 transition-colors text-base ${
                language === 'es' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
              }`}
            >
              Español
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
