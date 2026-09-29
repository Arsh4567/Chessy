import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'ghost' 
  | 'danger' 
  | 'success' 
  | 'accent'
  | 'icon';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ChessyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const ChessyButton = React.forwardRef<HTMLButtonElement, ChessyButtonProps>(({
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none disabled:active:scale-100';

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'text-xs px-3 py-1.5 min-h-[32px] gap-1.5',
    md: 'text-xs sm:text-sm px-4 py-2 min-h-[40px] gap-2',
    lg: 'text-sm sm:text-base px-6 py-2.5 min-h-[46px] gap-2.5',
    icon: 'p-2 min-h-[36px] min-w-[36px] aspect-square rounded-xl',
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-bold border border-transparent shadow-sm focus-visible:outline-sky-400',
    secondary: 'bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-100 border border-slate-700/80 hover:border-slate-600 focus-visible:outline-slate-400 shadow-sm',
    ghost: 'bg-transparent hover:bg-slate-800/60 active:bg-slate-800 text-slate-300 hover:text-white border border-transparent focus-visible:outline-slate-400',
    danger: 'bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/35 text-rose-300 hover:text-rose-200 border border-rose-500/30 focus-visible:outline-rose-400',
    success: 'bg-emerald-500/15 hover:bg-emerald-500/25 active:bg-emerald-500/35 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 focus-visible:outline-emerald-400',
    accent: 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold border border-indigo-400/30 shadow-sm focus-visible:outline-indigo-400',
    icon: 'bg-slate-900/80 hover:bg-slate-800 active:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 focus-visible:outline-sky-400',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

ChessyButton.displayName = 'ChessyButton';
