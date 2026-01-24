/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,js,ts,jsx,tsx,vue}', // ajusta la ruta a tu estructura
    './public/index.html',
  ],
  theme: {
    extend: {

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
  },
  darkMode: 'class',
  plugins: [
    require('@tailwindcss/forms')
  ],
}

