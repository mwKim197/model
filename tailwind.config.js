/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{html,js}"],
    theme: {
        extend: {
            colors: {
                'menu-gray': '#666666',
            }
        },
    },
    plugins: [require("tailwind-scrollbar-hide")],
}
