import React from 'react';
import { cn } from '../utils/cn';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  mobilePadding?: 'none' | 'sm' | 'md' | 'lg';
  centerContent?: boolean;
  fullHeight?: boolean;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  maxWidth = 'lg',
  padding = 'md',
  mobilePadding = 'sm',
  centerContent = false,
  fullHeight = false,
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
    full: 'max-w-full',
  };

  const paddingClasses = {
    none: '',
    sm: 'px-2 sm:px-4',
    md: 'px-4 sm:px-6 lg:px-8',
    lg: 'px-6 sm:px-8 lg:px-12',
  };

  const mobilePaddingClasses = {
    none: '',
    sm: 'mobile:px-2',
    md: 'mobile:px-4',
    lg: 'mobile:px-6',
  };

  return (
    <div
      className={cn(
        'w-full mx-auto',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        mobilePaddingClasses[mobilePadding],
        centerContent && 'flex items-center justify-center',
        fullHeight && 'min-h-screen',
        className
      )}
    >
      {children}
    </div>
  );
};

// Responsive Grid Component
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className = '',
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
}) => {
  const gapClasses = {
    sm: 'gap-2 sm:gap-3',
    md: 'gap-3 sm:gap-4 lg:gap-6',
    lg: 'gap-4 sm:gap-6 lg:gap-8',
  };

  const gridCols = `grid-cols-${cols.mobile || 1} sm:grid-cols-${cols.tablet || 2} lg:grid-cols-${cols.desktop || 3}`;

  return (
    <div className={cn('grid', gridCols, gapClasses[gap], className)}>
      {children}
    </div>
  );
};

// Responsive Card Component
interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
  hover = false,
}) => {
  const paddingClasses = {
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow',
    lg: 'shadow-lg',
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200',
        paddingClasses[padding],
        shadowClasses[shadow],
        hover && 'hover:shadow-lg transition-shadow duration-200',
        className
      )}
    >
      {children}
    </div>
  );
};

// Responsive Button Component
interface ResponsiveButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
  type = 'button',
}) => {
  const baseClasses = 'font-medium rounded-lg transition-all duration-200 flex items-center justify-center touch-manipulation';

  const variantClasses = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm hover:shadow-md',
    secondary: 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700',
    outline: 'border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-700',
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-touch-44',
    md: 'px-4 py-2 text-base min-h-touch-44 sm:px-6 sm:py-3',
    lg: 'px-6 py-3 text-lg min-h-touch-48 sm:px-8 sm:py-4',
  };

  const disabledClasses = 'opacity-50 cursor-not-allowed';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        disabled && disabledClasses,
        className
      )}
    >
      {children}
    </button>
  );
};

export default ResponsiveContainer;
