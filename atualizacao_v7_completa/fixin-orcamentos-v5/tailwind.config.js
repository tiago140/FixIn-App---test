/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        marinho: '#182F50',
        'marinho-escuro': '#0F1F36',
        verde: '#253728',
        'verde-claro': '#3F5A40',
        papel: 'var(--paper)',
        linha: 'var(--linha)',
        alerta: '#B8862E',
        sucesso: '#3F7A5E',
        erro: '#A63A2D',
        info: '#3B6B8C',
        accent: '#182F50',
      },
      fontFamily: {
        slab: ['"Poppins"', 'sans-serif'],
        sans: ['"Poppins"', '-apple-system', 'sans-serif'],
        mono: ['"Poppins"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
