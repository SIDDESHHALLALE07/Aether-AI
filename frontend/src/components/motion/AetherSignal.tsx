import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motionTokens } from './motionTokens';

export type SignalStatus = 'idle' | 'processing' | 'success' | 'error';

export interface AetherSignalProps {
  status: SignalStatus;
  label?: string;
  sublabel?: string;
  className?: string;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AetherSignal: React.FC<AetherSignalProps> = ({
  status,
  label,
  sublabel,
  className = '',
  compact = false,
  size = 'sm',
}) => {
  const iconSizeClass = size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg transition-colors ${className}`}>
      <div className="relative flex items-center justify-center flex-shrink-0">
        <AnimatePresence mode="wait">
          {status === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: motionTokens.duration.quick }}
              className="flex items-center justify-center text-blue-600 dark:text-blue-400"
            >
              <Loader2 className={`${iconSizeClass} animate-spin`} />
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: motionTokens.duration.quick }}
              className="flex items-center justify-center text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className={iconSizeClass} />
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: motionTokens.duration.quick }}
              className="flex items-center justify-center text-rose-600 dark:text-rose-400"
            >
              <AlertCircle className={iconSizeClass} />
            </motion.div>
          )}

          {status === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: motionTokens.duration.quick }}
              className="flex items-center justify-center text-slate-400 dark:text-slate-500"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!compact && label && (
        <div className="flex flex-col text-left">
          <span className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] leading-none">
            {label}
          </span>
          {sublabel && (
            <span className="text-[10px] text-[#64748B] dark:text-slate-400 leading-tight mt-0.5">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
