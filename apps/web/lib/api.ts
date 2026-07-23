import 'server-only';

// Cliente server-side de la API. Los GET no requieren key; la key solo se usa
// en el proxy de mutaciones (route handler). Nunca se expone al browser.
const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API ${res.status} en ${path}`);
  return res.json() as Promise<T>;
}

export function apiBaseUrl(): string {
  return API_URL;
}
