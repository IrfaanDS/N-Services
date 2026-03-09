/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#fdf2f4',
                    100: '#fce7ea',
                    200: '#f9d0d9',
                    300: '#f4a9b8',
                    400: '#ec7a93',
                    500: '#e04d6f',
                    600: '#cc2d55',
                    700: '#7C2D42',  /* Main brand — warm maroon */
                    800: '#6B2737',
                    900: '#5A2030',
                    950: '#330f1a',
                },
                accent: {
                    50: '#fef6ee',
                    100: '#fdead7',
                    200: '#fad1ae',
                    300: '#f6b17a',
                    400: '#E8734A',  /* Warm orange accent */
                    500: '#ee6530',
                    600: '#df4c1a',
                    700: '#b93817',
                    800: '#932e1a',
                    900: '#772818',
                },
                surface: {
                    50: '#F9FAFB',  /* Light bg */
                    100: '#F3F4F6',
                    200: '#E5E7EB',
                    300: '#D1D5DB',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
