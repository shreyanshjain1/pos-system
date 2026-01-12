/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",    // Next.js app directory
    "./pages/**/*.{js,ts,jsx,tsx}",  // If you use pages directory
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
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
