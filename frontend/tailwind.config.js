/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                /* ── Stripe-inspired palette ── */
                primary: {
                    50:  '#f5f3ff',
                    100: '#ede9fe',
                    200: '#d6d9fc',
                    300: '#b9b9f9',
                    400: '#665efd',
                    500: '#533afd',
                    600: '#533afd',
                    700: '#4434d4',
                    800: '#2e2b8c',
                    900: '#1c1e54',
                    950: '#0d1030',
                },
                accent: {
                    ruby:    '#ea2261',
                    magenta: '#f96bee',
                    'magenta-light': '#ffd7ef',
                    lemon:   '#9b6829',
                },
                surface: {
                    50:  '#ffffff',
                    100: '#f6f9fc',
                    200: '#e5edf5',
                    300: '#d4dce8',
                },
                heading:  '#061b31',
                body:     '#64748d',
                label:    '#273951',
                success:  '#15be53',
                'success-text': '#108c3d',
            },
            fontFamily: {
                sans:  ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono:  ['"Source Code Pro"', 'SFMono-Regular', 'monospace'],
            },
            borderRadius: {
                'xs':  '4px',
                'sm':  '5px',
                'md':  '6px',
                'lg':  '8px',
            },
            boxShadow: {
                'stripe-sm':    'rgba(23,23,23,0.06) 0px 3px 6px',
                'stripe':       'rgba(23,23,23,0.08) 0px 15px 35px',
                'stripe-lg':    'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px',
                'stripe-deep':  'rgba(3,3,39,0.25) 0px 14px 21px -14px, rgba(0,0,0,0.1) 0px 8px 17px -8px',
            },
        },
    },
    plugins: [],
}
