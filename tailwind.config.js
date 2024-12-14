/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{html,js}"],
    theme: {
        extend: {
            fontFamily: {
                custom: ['Light', 'sans-serif'], // 기본 폰트
            },
            colors: {
                'menu-gray': '#666666',
            }
        },
    },
    plugins: [require("tailwind-scrollbar-hide")],
}
