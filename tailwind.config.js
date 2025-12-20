/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        fantasy: ['Cinzel', 'Times New Roman', 'serif'],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-5px)' },
          '40%, 80%': { transform: 'translateX(5px)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 4px rgba(255,255,255,0.4)' },
          '50%': { boxShadow: '0 0 12px rgba(255,255,255,1)' },
        },
      },
      animation: {
        shake: 'shake 0.3s ease-in-out',
        gradient: 'gradient 3s ease infinite',
        glow: 'glow 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
