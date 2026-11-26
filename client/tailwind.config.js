/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: { navira: { 50: '#eff6ff', 100: '#dbeafe', 500: '#2563eb', 600: '#1d4ed8', 700: '#1d4ed8', 800: '#1e3a8a', 900: '#172554' } },
      boxShadow: { card: '0 8px 28px rgba(15, 23, 42, .06)' }
    }
  },
  plugins: []
};
