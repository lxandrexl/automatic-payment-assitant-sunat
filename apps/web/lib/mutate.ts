'use client';

// Helper de mutaciones desde componentes cliente: pega al proxy local.
export async function mutate<T = unknown>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/proxy${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const problem = await res.json().catch(() => ({ detail: `Error ${res.status}` }));
    throw new Error(problem.detail ?? `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}
