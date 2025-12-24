/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}", // Important : scanne tous les sous-dossiers src
    ],
    theme: {
        extend: {
            fontFamily: { sans: ['"Plus Jakarta Sans"', 'sans-serif'] },
            colors: {
                brand: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 900: '#1e3a8a' },
            },
            animation: { 'fade-in': 'fadeIn 0.3s ease-out', 'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' },
            keyframes: {
                fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
                slideUp: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } }
            }
        },
    },
    plugins: [],
}
