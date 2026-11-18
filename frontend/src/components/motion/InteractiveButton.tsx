import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { motionTokens } from './motionTokens';

interface InteractiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const InteractiveButton: React.FC<InteractiveButtonProps> = ({
  children,
  className = '',
  disabled,
  size = 'md',
  variant: _variant,
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();

  const sizeClass = size === 'sm' ? 'min-h-[38px]' : size === 'lg' ? 'min-h-[48px]' : 'min-h-[44px]';
  const hasMinHeight = className.includes('min-h-') || className.includes('h-');
  const baseClasses = `touch-manipulation select-none ${hasMinHeight ? '' : sizeClass} ${className}`;

  if (shouldReduceMotion || disabled) {
    return (
      <button
        disabled={disabled}
        className={baseClasses}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ duration: motionTokens.duration.instant, ease: motionTokens.ease.out }}
      disabled={disabled}
      className={baseClasses}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
};
