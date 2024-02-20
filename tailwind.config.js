/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        loader: 'loader 0.6s infinite alternate',
      },
      keyframes: {
        loader: {
          to: {
            opacity: 0.1,
            transform: 'translate3d(0, -.5rem, 0)',
          },
        },
      },
    },
  },
  plugins: [
    require('daisyui'),
    function ({ addVariant }) {
      addVariant('child', '& > *');
      addVariant('child-hover', '& > *:hover');
    },
  ],
  daisyui: {
      themes: [
        {
          mytheme: {
          
 "primary": "#c7d2fe",
          
 "secondary": "#F9F9F9",
          
 "accent": "#000000",
          
 "neutral": "#F9F9F9",
          
 "base-100": "#ffffff",
          
 "info": "#989898",
          
 "success": "#15803d",
          
 "warning": "#eab308",
          
 "error": "#e11d48",
          },
        },
      ],
    },
};
