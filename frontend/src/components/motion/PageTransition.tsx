import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { pageTransitionVariants } from './motionTokens';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = '',
  id,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div id={id} className={`w-full min-w-0 ${className}`}>{children}</div>;
  }

  return (
    <motion.div
      id={id}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransitionVariants}
      className={`w-full min-w-0 ${className}`}
    >
      {children}
    </motion.div>
  );
};
