import { ReactNode } from 'react';

interface GlassmorphicCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function GlassmorphicCard({ 
  children, 
  className = '',
  onClick 
}: GlassmorphicCardProps) {
  return (
    <div 
      className={`glass rounded-xl ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
