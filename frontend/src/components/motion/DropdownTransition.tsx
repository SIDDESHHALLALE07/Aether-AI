import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { dropdownVariants } from './motionTokens';

interface DropdownTransitionProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
}

export const DropdownTransition: React.FC<DropdownTransitionProps> = ({
  show,
  children,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : "initial"}
          animate={shouldReduceMotion ? { opacity: 1 } : "animate"}
          exit={shouldReduceMotion ? { opacity: 0 } : "exit"}
          variants={shouldReduceMotion ? undefined : dropdownVariants}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
