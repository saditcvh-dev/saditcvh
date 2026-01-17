/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,js,ts,jsx,tsx,vue}', // ajusta la ruta a tu estructura
    './public/index.html',
  ],
  theme: {
    extend: {
<<<<<<< HEAD
      animation: {
        'bounce': 'bounce 1s infinite',
        'spin': 'spin 1s linear infinite',
      },
      keyframes: {
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    }
=======

      // Agregamos los colores institucionales aquí para usar:
      // bg-guinda, text-dorado, border-gris, etc.
      colors: {
        guinda: {
          DEFAULT: '#691831', // Pantone 7421 C
          light: '#A02142',   // Pantone 7420 C
        },
        dorado: {
          DEFAULT: '#BC955B', // Pantone 465 C
          light: '#DDC9A3',   // Pantone 468 C
        },
        gris: {
          DEFAULT: '#6F7271', // Pantone 424 C
          light: '#98989A',   // Pantone Cool Gray 7 C
        }
      }

    },
>>>>>>> 17d8b98ecbaa333bc2d0ea581392739df1dc7a56
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
}

