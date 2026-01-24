'use client';

import { InteractiveHoverButton } from '@/components/UI/interactive-hover-button';

interface ReportButtonProps {
  onClick: () => void;
}

export default function ReportButton({ onClick }: ReportButtonProps) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <InteractiveHoverButton 
        text="Report Sighting" 
        onClick={onClick}
        className="shadow-2xl hover:shadow-red-500/30"
      />
    </div>
  );
}

