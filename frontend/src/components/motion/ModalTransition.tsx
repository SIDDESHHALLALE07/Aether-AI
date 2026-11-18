import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { modalVariants, motionTokens } from './motionTokens';

interface ModalTransitionProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  backdropClassName?: string;
  modalClassName?: string;
}

export const ModalTransition: React.FC<ModalTransitionProps> = ({
  isOpen,
  onClose,
  children,
  backdropClassName = 'fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4',
  modalClassName = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={backdropClassName} onClick={onClose}>
          {/* Backdrop Fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.duration.quick, ease: motionTokens.ease.out }}
            className="absolute inset-0 bg-transparent"
          />

          {/* Modal Container */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : "initial"}
            animate={shouldReduceMotion ? { opacity: 1 } : "animate"}
            exit={shouldReduceMotion ? { opacity: 0 } : "exit"}
            variants={shouldReduceMotion ? undefined : modalVariants}
            onClick={(e) => e.stopPropagation()}
            className={`relative z-10 w-full max-w-xl ${modalClassName}`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
