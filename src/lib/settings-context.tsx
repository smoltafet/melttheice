"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ColorMode = 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
export type TextSize = 'sm' | 'base' | 'lg' | 'xl';

interface SettingsContextType {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  getUrgencyColors: (urgency: 'high' | 'medium' | 'low') => { bg: string; border: string; text: string; dot: string; hover: string };
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Color palettes for different modes
const PALETTES = {
  default: {
    high: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500", hover: "hover:bg-red-100" },
    medium: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", dot: "bg-orange-500", hover: "hover:bg-orange-100" },
    low: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", dot: "bg-gray-400", hover: "hover:bg-gray-100" },
  },
  protanopia: { // Red-blind: Avoid Red/Green. Use Blue/Yellow.
    high: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-600", hover: "hover:bg-blue-100" }, 
    medium: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", dot: "bg-yellow-500", hover: "hover:bg-yellow-100" },
    low: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", dot: "bg-gray-500", hover: "hover:bg-gray-100" },
  },
  deuteranopia: { // Green-blind: Similar to Protanopia, Blue/Yellow/Gray works best.
    high: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", dot: "bg-indigo-600", hover: "hover:bg-indigo-100" },
    medium: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500", hover: "hover:bg-amber-100" },
    low: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", dot: "bg-slate-400", hover: "hover:bg-slate-100" },
  },
  tritanopia: { // Blue-blind: Avoid Blue/Yellow. Use Red/Cyan/Pink.
    high: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", dot: "bg-rose-600", hover: "hover:bg-rose-100" },
    medium: { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", dot: "bg-cyan-600", hover: "hover:bg-cyan-100" },
    low: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", dot: "bg-gray-400", hover: "hover:bg-gray-100" },
  },
  achromatopsia: { // Monochromacy: High contrast Grayscale.
    high: { bg: "bg-black", border: "border-black", text: "text-white", dot: "bg-white", hover: "hover:bg-gray-900" }, // Inverted for high urgency
    medium: { bg: "bg-gray-300", border: "border-gray-400", text: "text-black", dot: "bg-black", hover: "hover:bg-gray-400" },
    low: { bg: "bg-white", border: "border-gray-300", text: "text-gray-600", dot: "bg-gray-400", hover: "hover:bg-gray-50" },
  }
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [colorMode, setColorMode] = useState<ColorMode>('default');
  const [textSize, setTextSize] = useState<TextSize>('base');

  // Persist settings (optional, could use localStorage)
  useEffect(() => {
    const savedColor = localStorage.getItem('colorMode') as ColorMode;
    const savedSize = localStorage.getItem('textSize') as TextSize;
    if (savedColor) setColorMode(savedColor);
    if (savedSize) setTextSize(savedSize);
  }, []);

  const updateColorMode = (mode: ColorMode) => {
    setColorMode(mode);
    localStorage.setItem('colorMode', mode);
  };

  const updateTextSize = (size: TextSize) => {
    setTextSize(size);
    localStorage.setItem('textSize', size);
    
    // Apply text size to root html for rem-based scaling if needed, 
    // but for now we'll just expose the class/size through context
    document.documentElement.setAttribute('data-text-size', size);
  };

  const getUrgencyColors = (urgency: 'high' | 'medium' | 'low') => {
    return PALETTES[colorMode][urgency];
  };

  return (
    <SettingsContext.Provider value={{ 
      colorMode, 
      setColorMode: updateColorMode, 
      textSize, 
      setTextSize: updateTextSize,
      getUrgencyColors 
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
