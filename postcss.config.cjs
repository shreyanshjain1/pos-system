/* PostCSS config (CommonJS) for Next.js + Turbopack
   Use the new @tailwindcss/postcss plugin and autoprefixer.
*/
module.exports = {
  plugins: {
    // Removed Tailwind PostCSS plugin so plain CSS modules work without Tailwind dependency
    autoprefixer: {},
  },
}
