/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      // Optional: Add Google Material Design 3 colors as named classes
      // This makes code shorter: bg-google-dark instead of bg-[#202124]
      colors: {
        google: {
          // Dark Theme Colors
          'dark-bg': '#202124',
          'dark-surface': '#292a2d',
          'dark-surface-variant': '#3c4043',
          'dark-border': '#3c4043',
          'dark-text': '#e8eaed',
          'dark-text-secondary': '#9aa0a6',
          'dark-primary': '#8ab4f8',
          'dark-primary-hover': '#aecbfa',
          
          // Light Theme Colors
          'light-bg': '#f8f9fa',
          'light-surface': '#ffffff',
          'light-surface-variant': '#f1f3f4',
          'light-border': '#dadce0',
          'light-text': '#202124',
          'light-text-secondary': '#5f6368',
          'light-primary': '#1a73e8',
          'light-primary-hover': '#1967d2',
          
          // Status Colors - Success (Dark)
          'dark-success': '#81c995',
          'dark-success-bg': '#1e4620',
          
          // Status Colors - Success (Light)
          'light-success': '#137333',
          'light-success-bg': '#e6f4ea',
          
          // Status Colors - Info (Dark)
          'dark-info': '#8ab4f8',
          'dark-info-bg': 'rgba(138, 180, 248, 0.2)',
          
          // Status Colors - Info (Light)
          'light-info': '#1967d2',
          'light-info-bg': '#d3e3fd',
        },
      },
      
      // Optional: Add custom animations
      animation: {
        'blob': 'blob 7s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
      },
      
      // Optional: Add custom spacing for Google's 4px grid
      spacing: {
        '18': '4.5rem', // 72px
        '88': '22rem',  // 352px
      },
      
      // Optional: Add custom border radius
      borderRadius: {
        'google': '8px',
        'google-lg': '12px',
      },
      
      // Optional: Add custom shadows for Material Design
      boxShadow: {
        'google': '0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)',
        'google-lg': '0 1px 3px 0 rgba(60, 64, 67, 0.3), 0 4px 8px 3px rgba(60, 64, 67, 0.15)',
      },
      
      // Optional: Transition duration presets
      transitionDuration: {
        '200': '200ms', // Google's standard transition
      },
    },
  },
  plugins: [],
};