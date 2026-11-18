import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { motionTokens } from './motionTokens';

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  lift?: boolean;
  onClick?: () => void;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = '',
  interactive = false,
  lift = true,
  onClick,
  ...rest
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion || !interactive) {
    return (
      <div
        className={`card-base ${interactive ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700' : ''} ${className}`}
        onClick={onClick}
        {...rest}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      whileHover={lift ? { y: -2, transition: { duration: motionTokens.duration.quick, ease: motionTokens.ease.out } } : undefined}
      whileTap={onClick ? { scale: 0.995, transition: { duration: motionTokens.duration.instant } } : undefined}
      className={`card-base cursor-pointer ${className}`}
      onClick={onClick}
      {...(rest as any)}
    >
      {children}
    </motion.div>
  );
};
