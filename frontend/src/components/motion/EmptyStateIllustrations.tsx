import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface IllustrationProps {
  className?: string;
}

/**
 * Aether Data Threads - Abstract mathematical and data-geometry SVGs
 * Styled using existing palette: royal blue (#2563EB), soft indigo (#4F46E5), emerald (#10B981), and neutral slate.
 */

export const NoDatasetsIllustration: React.FC<IllustrationProps> = ({ className = 'w-32 h-32' }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Subtle background grid nodes */}
        <circle cx="40" cy="40" r="2" className="fill-slate-300 dark:fill-slate-700" />
        <circle cx="80" cy="40" r="2" className="fill-slate-300 dark:fill-slate-700" />
        <circle cx="120" cy="40" r="2" className="fill-slate-300 dark:fill-slate-700" />
        <circle cx="40" cy="80" r="2" className="fill-slate-300 dark:fill-slate-700" />
        <circle cx="120" cy="80" r="2" className="fill-slate-300 dark:fill-slate-700" />
        <circle cx="40" cy="120" r="2" className="fill-slate-300 dark:fill-slate-700" />
        <circle cx="80" cy="120" r="2" className="fill-slate-300 dark:fill-slate-700" />
        <circle cx="120" cy="120" r="2" className="fill-slate-300 dark:fill-slate-700" />

        {/* Data Thread connecting paths */}
        <motion.path
          d="M40 80 Q60 50 80 80 T120 80"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeDasharray="4 4"
          className="text-blue-500/60 dark:text-blue-400/50"
          initial={shouldReduceMotion ? undefined : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />

        {/* Central File / Table Card Outline */}
        <rect
          x="52"
          y="42"
          width="56"
          height="76"
          rx="8"
          className="stroke-blue-600 dark:stroke-blue-400 fill-white dark:fill-slate-900 shadow-sm"
          strokeWidth="1.75"
        />

        {/* Sheet grid lines */}
        <line x1="62" y1="60" x2="98" y2="60" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="62" y1="72" x2="98" y2="72" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="62" y1="84" x2="98" y2="84" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="62" y1="96" x2="88" y2="96" className="stroke-blue-200 dark:stroke-blue-800" strokeWidth="1.5" strokeLinecap="round" />

        {/* Accent Data Node */}
        <circle cx="80" cy="80" r="4.5" className="fill-blue-600 dark:fill-blue-400 stroke-white dark:stroke-slate-900" strokeWidth="2" />
      </svg>
    </div>
  );
};

export const NoProjectsIllustration: React.FC<IllustrationProps> = ({ className = 'w-32 h-32' }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Branching Workspaces */}
        <motion.path
          d="M80 115 V85 M80 85 L50 55 M80 85 L110 55"
          stroke="currentColor"
          strokeWidth="1.75"
          className="text-slate-300 dark:text-slate-700"
          strokeLinecap="round"
          initial={shouldReduceMotion ? undefined : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />

        {/* Origin Node */}
        <circle cx="80" cy="115" r="5" className="fill-slate-400 dark:fill-slate-600 stroke-white dark:stroke-slate-900" strokeWidth="2" />

        {/* Branch Nodes (Projects) */}
        <rect x="36" y="41" width="28" height="28" rx="6" className="fill-blue-50 dark:fill-blue-950/60 stroke-blue-500 dark:stroke-blue-400" strokeWidth="1.5" />
        <circle cx="50" cy="55" r="3" className="fill-blue-600 dark:fill-blue-400" />

        <rect x="96" y="41" width="28" height="28" rx="6" className="fill-indigo-50 dark:fill-indigo-950/60 stroke-indigo-500 dark:stroke-indigo-400" strokeWidth="1.5" />
        <circle cx="110" cy="55" r="3" className="fill-indigo-600 dark:fill-indigo-400" />
      </svg>
    </div>
  );
};

export const NoVisualizationsIllustration: React.FC<IllustrationProps> = ({ className = 'w-32 h-32' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Coordinate axes */}
        <line x1="35" y1="125" x2="125" y2="125" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="35" y1="125" x2="35" y2="35" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="1.5" strokeLinecap="round" />

        {/* Trend Curve Thread */}
        <path
          d="M45 110 Q65 95 80 65 T120 45"
          className="stroke-blue-500 dark:stroke-blue-400"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />

        {/* Area beneath curve */}
        <path
          d="M45 110 Q65 95 80 65 T120 45 V125 H45 Z"
          className="fill-blue-500/10 dark:fill-blue-400/10"
        />

        {/* Key Data Points */}
        <circle cx="45" cy="110" r="3.5" className="fill-blue-600 stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
        <circle cx="80" cy="65" r="3.5" className="fill-indigo-600 stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
        <circle cx="120" cy="45" r="3.5" className="fill-emerald-500 stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

export const NoPatternsIllustration: React.FC<IllustrationProps> = ({ className = 'w-32 h-32' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Radar / Anomaly Rings */}
        <circle cx="80" cy="80" r="50" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="80" cy="80" r="32" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="1" strokeDasharray="2 2" />
        <circle cx="80" cy="80" r="14" className="stroke-blue-500/40 dark:stroke-blue-400/40" strokeWidth="1" />

        {/* Scatter distribution */}
        <circle cx="70" cy="74" r="2.5" className="fill-slate-400 dark:fill-slate-600" />
        <circle cx="88" cy="86" r="2.5" className="fill-slate-400 dark:fill-slate-600" />
        <circle cx="94" cy="70" r="2.5" className="fill-slate-400 dark:fill-slate-600" />
        <circle cx="64" cy="90" r="2.5" className="fill-slate-400 dark:fill-slate-600" />

        {/* Anomaly Signal Point */}
        <circle cx="112" cy="52" r="4.5" className="fill-sky-500 stroke-sky-200 dark:stroke-sky-900" strokeWidth="2" />
        <path d="M80 80 L112 52" className="stroke-sky-400/60" strokeWidth="1" strokeDasharray="2 2" />
      </svg>
    </div>
  );
};

export const NoReportsIllustration: React.FC<IllustrationProps> = ({ className = 'w-32 h-32' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Document Silhouette */}
        <rect x="50" y="35" width="60" height="90" rx="8" className="fill-white dark:fill-slate-900 stroke-emerald-600 dark:stroke-emerald-500" strokeWidth="1.75" />
        {/* Top Fold */}
        <path d="M92 35 V53 H110" className="stroke-emerald-600 dark:stroke-emerald-500" strokeWidth="1.75" fill="none" />
        {/* Text lines */}
        <line x1="62" y1="62" x2="98" y2="62" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="62" y1="74" x2="98" y2="74" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="62" y1="86" x2="84" y2="86" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="1.5" strokeLinecap="round" />
        {/* Stamp / Badge */}
        <circle cx="95" cy="105" r="7" className="fill-emerald-100 dark:fill-emerald-950 stroke-emerald-600 dark:stroke-emerald-400" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

export const NoSearchResultsIllustration: React.FC<IllustrationProps> = ({ className = 'w-32 h-32' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Glass Loop */}
        <circle cx="75" cy="75" r="30" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="2" />
        <line x1="97" y1="97" x2="125" y2="125" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="3" strokeLinecap="round" />
        {/* Ghosted data points */}
        <circle cx="68" cy="70" r="2.5" className="fill-slate-300 dark:fill-slate-700" />
        <circle cx="82" cy="78" r="2.5" className="fill-slate-300 dark:fill-slate-700" />
      </svg>
    </div>
  );
};

export const CopilotWelcomeIllustration: React.FC<IllustrationProps> = ({ className = 'w-36 h-36' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Concentric intelligence orbit threads */}
        <circle cx="80" cy="80" r="54" className="stroke-blue-200 dark:stroke-blue-900/50" strokeWidth="1" strokeDasharray="3 4" />
        <circle cx="80" cy="80" r="36" className="stroke-indigo-300 dark:stroke-indigo-800/60" strokeWidth="1.25" />
        
        {/* Central Core */}
        <circle cx="80" cy="80" r="16" className="fill-blue-50 dark:fill-blue-950/80 stroke-blue-600 dark:stroke-blue-400" strokeWidth="1.75" />
        <circle cx="80" cy="80" r="6" className="fill-blue-600 dark:fill-blue-400" />

        {/* Orbiting Satellite Data Nodes */}
        <circle cx="116" cy="80" r="3.5" className="fill-indigo-600 dark:fill-indigo-400 stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
        <circle cx="54" cy="54" r="3.5" className="fill-emerald-500 dark:fill-emerald-400 stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
      </svg>
    </div>
  );
};
