/**
 * Framer Motion Animation Utilities
 * Centralized animation variants and transition configs for consistent UI animations
 */

import { Variants, Transition } from 'framer-motion'

// Check if user prefers reduced motion
export function useReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Transition presets
export const transitions = {
  // Fast interactions (buttons, hovers)
  fast: { duration: 0.15, ease: 'easeOut' } as Transition,
  
  // Standard UI animations (cards, modals)
  standard: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } as Transition,
  
  // Smooth page transitions
  smooth: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } as Transition,
  
  // Spring animations (playful interactions)
  spring: { type: 'spring', stiffness: 300, damping: 30 } as Transition,
}

// Page entrance animation
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.smooth
  },
  exit: { opacity: 0, y: -10, transition: transitions.fast }
}

// Card animations
export const cardVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: transitions.standard
  },
  hover: {
    y: -4,
    transition: transitions.fast
  }
}

// Simple fade up animation
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.standard
  }
}

// Stagger container for list animations
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
}

// Individual list item animation
export const listItem: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.standard
  }
}

// Button interaction variants
export const buttonVariants: Variants = {
  hover: { 
    scale: 1.02,
    transition: transitions.fast
  },
  tap: { 
    scale: 0.98,
    transition: transitions.fast
  }
}

// Sidebar item variants
export const sidebarItemVariants: Variants = {
  inactive: {
    backgroundColor: 'rgba(0, 0, 0, 0)',
    transition: transitions.fast
  },
  active: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)', // Subtle indigo tint
    transition: transitions.fast
  },
  hover: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    transition: transitions.fast
  }
}

// Table row hover animation
export const tableRowVariants: Variants = {
  initial: { backgroundColor: 'rgba(0, 0, 0, 0)' },
  hover: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    transition: transitions.fast
  }
}

// Modal/dropdown entrance
export const dropdownVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: -10 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: transitions.standard
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: transitions.fast
  }
}

// Utility function to disable animations if user prefers reduced motion
export function getVariants(variants: Variants, reducedMotion: boolean): Variants {
  if (reducedMotion) {
    // Return simplified variants with no movement, only opacity
    const simplified: Variants = {}
    Object.keys(variants).forEach(key => {
      const variant = variants[key]
      if (typeof variant === 'object' && variant !== null) {
        simplified[key] = { opacity: (variant as any).opacity ?? 1, transition: { duration: 0.01 } }
      } else {
        simplified[key] = { opacity: 1, transition: { duration: 0.01 } }
      }
    })
    return simplified
  }
  return variants
}
