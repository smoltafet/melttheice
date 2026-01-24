'use client';

import { motion } from 'framer-motion';

interface ReportButtonProps {
  onClick: () => void;
}

export default function ReportButton({ onClick }: ReportButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 glass px-8 py-4 rounded-full
                 text-white font-semibold text-lg shadow-2xl
                 hover:scale-105 active:scale-95 transition-all duration-200"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="flex items-center gap-3">
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <span>Report Sighting</span>
      </div>
    </motion.button>
  );
}
