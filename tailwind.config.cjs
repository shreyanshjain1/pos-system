/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
  "./app/**/*.{js,ts,jsx,tsx,mdx}",
  "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      container: {
        center: true,
        padding: '1rem',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      borderRadius: {
        lg: '12px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(15, 23, 42, 0.04)',
        DEFAULT: '0 4px 16px rgba(15, 23, 42, 0.06)'
      },
      colors: {
        brand: {
          DEFAULT: '#0f172a'
        }
      }
    }
  },
  plugins: []
}