/**
 * AETHER FLOW MOTION DESIGN SYSTEM TOKENS
 * "Quiet Motion, Intelligent Design"
 * 
 * Strict timing, easing, and spring definitions adhering to
 * enterprise analytical standards.
 */

export const motionTokens = {
  duration: {
    instant: 0.1,    // 100ms: button press, micro-interactions
    quick: 0.15,     // 150ms: hover, quick feedback
    sidebar: 0.18,   // 180ms: sidebar transitions
    dropdown: 0.18,  // 180ms: dropdowns and popovers
    modal: 0.22,     // 220ms: modals and overlays
    page: 0.25,      // 250ms: page and view transitions
    chart: 0.32,     // 320ms: chart reveals
    ambient: 0.5,    // 500ms: illustrations and empty state threads
  },
  ease: {
    // Elegant ease-out for entrances
    out: [0.16, 1, 0.3, 1] as const,
    // Smooth ease-in-out for shared state shifts
    inOut: [0.4, 0, 0.2, 1] as const,
    // Sharp ease-in for exits
    sharp: [0.4, 0, 1, 1] as const,
  },
  spring: {
    // Highly responsive spring with zero oscillation/bounce
    tactile: {
      type: 'spring' as const,
      stiffness: 420,
      damping: 32,
      mass: 0.8,
    },
    // Smooth layout transitions (e.g. Aether Glide)
    glide: {
      type: 'spring' as const,
      stiffness: 350,
      damping: 30,
    },
    // Gentle modal and card lift
    gentle: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 28,
    },
  },
};

export const pageTransitionVariants = {
  initial: {
    opacity: 0,
    y: 6,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.duration.page,
      ease: motionTokens.ease.out,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: motionTokens.duration.quick,
      ease: motionTokens.ease.inOut,
    },
  },
};

export const staggerContainerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

export const staggerItemVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.duration.page,
      ease: motionTokens.ease.out,
    },
  },
};

export const dropdownVariants = {
  initial: {
    opacity: 0,
    y: -4,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: motionTokens.duration.dropdown,
      ease: motionTokens.ease.out,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: {
      duration: motionTokens.duration.instant,
      ease: motionTokens.ease.inOut,
    },
  },
};

export const modalVariants = {
  initial: {
    opacity: 0,
    scale: 0.97,
    y: 8,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: motionTokens.duration.modal,
      ease: motionTokens.ease.out,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 6,
    transition: {
      duration: motionTokens.duration.quick,
      ease: motionTokens.ease.inOut,
    },
  },
};
