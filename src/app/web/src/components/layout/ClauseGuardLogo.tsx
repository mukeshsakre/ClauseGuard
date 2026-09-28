import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface ClauseGuardLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

export const ClauseGuardLogo: React.FC<ClauseGuardLogoProps> = ({ 
  size = 'md',
  className = '',
  onClick
}) => {
  const sizeConfig = {
    sm: {
      container: 'w-6 h-6 rounded-md',
      icon: 'w-3.5 h-3.5',
      text: 'text-base'
    },
    md: {
      container: 'w-7 h-7 rounded-lg',
      icon: 'w-4 h-4',
      text: 'text-lg'
    },
    lg: {
      container: 'w-9 h-9 rounded-xl',
      icon: 'w-5 h-5',
      text: 'text-xl'
    },
    xl: {
      container: 'w-11 h-11 rounded-2xl',
      icon: 'w-6 h-6',
      text: 'text-2xl'
    }
  };

  const current = sizeConfig[size] || sizeConfig.md;

  return (
    <div 
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 whitespace-nowrap select-none group ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Clean, minimalist basic icon mark */}
      <div className={`${current.container} bg-zinc-950 text-white flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105`}>
        <ShieldCheck className={`${current.icon} text-white stroke-[2.2]`} />
      </div>

      {/* Basic, timeless typography */}
      <div className="flex items-center font-bold tracking-tight text-zinc-950 font-sans">
        <span className={current.text}>ClauseGuard</span>
      </div>
    </div>
  );
};
