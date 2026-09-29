import React from 'react';

export interface ChessyCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const ChessyCard: React.FC<ChessyCardProps> = ({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'rounded-2xl transition-all duration-200 border';

  const variantClasses = {
    default: 'bg-[#0c1424] border-slate-800/90 shadow-lg text-slate-100',
    elevated: 'bg-[#0f172a] border-slate-700/80 shadow-xl text-slate-100',
    subtle: 'bg-slate-900/50 border-slate-800/60 text-slate-200',
    interactive: 'bg-[#0c1424] hover:bg-[#111c33] border-slate-800 hover:border-slate-700 shadow-md hover:shadow-xl cursor-pointer text-slate-100 active:scale-[0.99]',
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
