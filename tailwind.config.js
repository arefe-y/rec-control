/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{html,js,svelte,ts}'],
    theme: {
        extend: {
            boxShadow: {
                panel: '0 12px 50px rgba(15, 23, 42, 0.12)'
            }
        }
    },
    plugins: []
};
