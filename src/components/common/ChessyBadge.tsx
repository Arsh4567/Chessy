import React from 'react';

export type BadgeVariant = 
  | 'default' 
  | 'primary' 
  | 'success' 
  | 'danger' 
  | 'warning' 
  | 'outline' 
  | 'accent';

export interface ChessyBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export const ChessyBadge: React.FC<ChessyBadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-lg select-none whitespace-nowrap';

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const variantClasses: Record<BadgeVariant, string> = {
    default: 'bg-slate-800 text-slate-300 border border-slate-700/60',
    primary: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
    success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    danger: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    outline: 'bg-transparent text-slate-400 border border-slate-700',
    accent: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
  };

  return (
    <span
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
