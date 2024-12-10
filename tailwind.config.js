/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{html,js}"],
    safelist: [
        'light-font',
    ],
    theme: {
        extend: {
            fontFamily: {
                custom: ['LightFont', 'sans-serif'], // 기본 폰트
            },
            colors: {
                'menu-gray': '#666666',
            }
        },
    },
    plugins: [require("tailwind-scrollbar-hide")],
}
