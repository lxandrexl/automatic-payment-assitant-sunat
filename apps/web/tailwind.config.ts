import type { Config } from 'tailwindcss';

// Tokens semánticos: el color de marca es uno solo; verde/ámbar/rojo/azul solo
// significan ESTADO (ok/atención/urgente/info), nunca decoran.
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#f5f6f8',
        surface: '#ffffff',
        sunken: '#eceef2',
        line: '#e1e4ea',
        ink: '#172033',
        ink2: '#475066',
        ink3: '#6b7385',
        brand: { DEFAULT: '#1f4e79', hover: '#173d5f', soft: '#e8eff7' },
        ok: { DEFAULT: '#166534', soft: '#e7f4ec' },
        warn: { DEFAULT: '#92400e', soft: '#fdf3df' },
        bad: { DEFAULT: '#b42318', soft: '#fdecea' },
        info: { DEFAULT: '#1d5a8a', soft: '#e6f0f8' },
        // Segunda fuente de ingreso (recibos por honorarios), distinta del azul de marca (facturas).
        hono: { DEFAULT: '#0f6b5f', soft: '#e1f3ef' },
      },
    },
  },
  plugins: [],
} satisfies Config;
