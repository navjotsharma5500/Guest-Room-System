// src/utils/themeUtils.js
/**
 * Centralized Theme Utility
 * Provides theme-aware colors and glassmorphism effects
 * Supports: Light, Dark, Aurora Night, Graphite Cyan
 */

export const getThemeColors = (theme) => {
  switch(theme) {
    case 'aurora':
      return {
        // Primary Colors (Fuchsia)
        primary: 'fuchsia',
        primaryBg: 'bg-fuchsia-600',
        primaryBgLight: 'bg-fuchsia-100',
        primaryBgDark: 'bg-fuchsia-700',
        primaryText: 'text-fuchsia-600',
        primaryTextLight: 'text-fuchsia-700',
        primaryTextDark: 'text-fuchsia-400',
        primaryBorder: 'border-fuchsia-300',
        primaryBorderStrong: 'border-fuchsia-500',
        primaryHover: 'hover:bg-fuchsia-700',
        primaryRing: 'focus:ring-fuchsia-500',
        primaryGradient: 'from-fuchsia-600 to-fuchsia-700',
        
        // Glassmorphism Effects
        glass: 'bg-white/10 backdrop-blur-xl border border-white/20',
        glassHover: 'hover:bg-white/20',
        glassCard: 'bg-black/30 backdrop-blur-2xl border border-white/10',
        glassModal: 'bg-black/40 backdrop-blur-3xl border border-white/20',
        glassInput: 'bg-white/5 backdrop-blur-md border border-white/20 focus:bg-white/10',
        glassButton: 'bg-fuchsia-600/80 backdrop-blur-md hover:bg-fuchsia-700/90',
        
        // Status Colors (keep semantic meaning)
        success: 'text-green-400',
        successBg: 'bg-green-500/20',
        error: 'text-red-400',
        errorBg: 'bg-red-500/20',
        warning: 'text-yellow-400',
        warningBg: 'bg-yellow-500/20',
        
        // Text Colors
        textPrimary: 'text-white',
        textSecondary: 'text-gray-300',
        textMuted: 'text-gray-400',
      };
      
    case 'graphite':
      return {
        // Primary Colors (Cyan)
        primary: 'cyan',
        primaryBg: 'bg-cyan-600',
        primaryBgLight: 'bg-cyan-100',
        primaryBgDark: 'bg-cyan-700',
        primaryText: 'text-cyan-600',
        primaryTextLight: 'text-cyan-700',
        primaryTextDark: 'text-cyan-400',
        primaryBorder: 'border-cyan-300',
        primaryBorderStrong: 'border-cyan-500',
        primaryHover: 'hover:bg-cyan-700',
        primaryRing: 'focus:ring-cyan-500',
        primaryGradient: 'from-cyan-600 to-cyan-700',
        
        // Glassmorphism Effects
        glass: 'bg-white/5 backdrop-blur-xl border border-white/10',
        glassHover: 'hover:bg-white/10',
        glassCard: 'bg-white/5 backdrop-blur-xl border border-white/10',
        glassModal: 'bg-white/10 backdrop-blur-3xl border border-white/20',
        glassInput: 'bg-white/5 backdrop-blur-md border border-white/10 focus:bg-white/10',
        glassButton: 'bg-cyan-600/80 backdrop-blur-md hover:bg-cyan-700/90',
        
        // Status Colors (keep semantic meaning)
        success: 'text-green-400',
        successBg: 'bg-green-500/20',
        error: 'text-red-400',
        errorBg: 'bg-red-500/20',
        warning: 'text-yellow-400',
        warningBg: 'bg-yellow-500/20',
        
        // Text Colors
        textPrimary: 'text-white',
        textSecondary: 'text-gray-300',
        textMuted: 'text-gray-400',
      };
      
    case 'dark':
      return {
        // Primary Colors (Red - Classic)
        primary: 'red',
        primaryBg: 'bg-red-600',
        primaryBgLight: 'bg-red-100',
        primaryBgDark: 'bg-red-700',
        primaryText: 'text-red-600',
        primaryTextLight: 'text-red-700',
        primaryTextDark: 'text-red-400',
        primaryBorder: 'border-red-300',
        primaryBorderStrong: 'border-red-500',
        primaryHover: 'hover:bg-red-700',
        primaryRing: 'focus:ring-red-500',
        primaryGradient: 'from-red-600 to-red-700',
        
        // Solid Backgrounds (no glassmorphism)
        glass: 'bg-gray-800 border border-gray-700',
        glassHover: 'hover:bg-gray-700',
        glassCard: 'bg-gray-800 border border-gray-700',
        glassModal: 'bg-gray-800 border border-gray-700',
        glassInput: 'bg-gray-700 border border-gray-600 focus:bg-gray-600',
        glassButton: 'bg-red-600 hover:bg-red-700',
        
        // Status Colors
        success: 'text-green-400',
        successBg: 'bg-green-900',
        error: 'text-red-400',
        errorBg: 'bg-red-900',
        warning: 'text-yellow-400',
        warningBg: 'bg-yellow-900',
        
        // Text Colors
        textPrimary: 'text-gray-100',
        textSecondary: 'text-gray-300',
        textMuted: 'text-gray-400',
      };
      
    default: // 'light'
      return {
        // Primary Colors (Red - Classic)
        primary: 'red',
        primaryBg: 'bg-red-600',
        primaryBgLight: 'bg-red-50',
        primaryBgDark: 'bg-red-700',
        primaryText: 'text-red-600',
        primaryTextLight: 'text-red-700',
        primaryTextDark: 'text-red-800',
        primaryBorder: 'border-red-300',
        primaryBorderStrong: 'border-red-500',
        primaryHover: 'hover:bg-red-700',
        primaryRing: 'focus:ring-red-500',
        primaryGradient: 'from-red-600 to-red-700',
        
        // Solid Backgrounds (no glassmorphism)
        glass: 'bg-white border border-gray-200',
        glassHover: 'hover:bg-gray-50',
        glassCard: 'bg-white border border-gray-200',
        glassModal: 'bg-white border border-gray-300',
        glassInput: 'bg-white border border-gray-300 focus:bg-gray-50',
        glassButton: 'bg-red-600 hover:bg-red-700',
        
        // Status Colors
        success: 'text-green-600',
        successBg: 'bg-green-50',
        error: 'text-red-600',
        errorBg: 'bg-red-50',
        warning: 'text-yellow-600',
        warningBg: 'bg-yellow-50',
        
        // Text Colors
        textPrimary: 'text-gray-900',
        textSecondary: 'text-gray-700',
        textMuted: 'text-gray-500',
      };
  }
};

/**
 * Get modal backdrop style based on theme
 */
export const getModalBackdrop = (theme) => {
  if (theme === 'aurora' || theme === 'graphite') {
    return 'bg-black/60 backdrop-blur-md';
  }
  return 'bg-black/50 backdrop-blur-sm';
};

/**
 * Get card style with proper glassmorphism
 */
export const getCardStyle = (theme, isActive = false) => {
  const colors = getThemeColors(theme);
  
  if (isActive) {
    return `${colors.glassCard} ${colors.primaryBorderStrong} shadow-lg`;
  }
  
  return `${colors.glassCard} ${colors.glassHover} shadow-md`;
};

/**
 * Get input style with glassmorphism
 */
export const getInputStyle = (theme) => {
  const colors = getThemeColors(theme);
  return `${colors.glassInput} ${colors.primaryRing} outline-none transition-all`;
};

/**
 * Get button style with glassmorphism
 */
export const getButtonStyle = (theme, variant = 'primary') => {
  const colors = getThemeColors(theme);
  
  switch(variant) {
    case 'primary':
      return `${colors.glassButton} text-white font-semibold shadow-lg transition-all`;
    case 'secondary':
      return `${colors.glass} ${colors.glassHover} ${colors.textPrimary} font-semibold transition-all`;
    case 'danger':
      return theme === 'aurora' || theme === 'graphite'
        ? 'bg-red-600/80 backdrop-blur-md hover:bg-red-700/90 text-white font-semibold shadow-lg transition-all'
        : 'bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg transition-all';
    default:
      return colors.glass;
  }
};

/**
 * Check if theme uses glassmorphism
 */
export const isGlassTheme = (theme) => {
  return theme === 'aurora' || theme === 'graphite';
};

/**
 * Get text color based on theme and variant
 */
export const getTextColor = (theme, variant = 'primary') => {
  const colors = getThemeColors(theme);
  
  switch(variant) {
    case 'primary':
      return colors.textPrimary;
    case 'secondary':
      return colors.textSecondary;
    case 'muted':
      return colors.textMuted;
    case 'accent':
      return colors.primaryText;
    default:
      return colors.textPrimary;
  }
};

export default {
  getThemeColors,
  getModalBackdrop,
  getCardStyle,
  getInputStyle,
  getButtonStyle,
  isGlassTheme,
  getTextColor,
};