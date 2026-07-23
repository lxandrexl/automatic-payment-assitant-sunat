import { NextRequest, NextResponse } from 'next/server';

// Proxy de mutaciones: el browser llama /proxy/<ruta>, el server reenvía a la API
// añadiendo X-Api-Key (que nunca sale del server). SPEC §7.
const API_URL = process.env.API_URL ?? 'http://localhost:3001';
const API_KEY = process.env.API_KEY ?? '';

async function forward(req: NextRequest, path: string[]): Promise<NextResponse> {
  const url = `${API_URL}/api/v1/${path.join('/')}${req.nextUrl.search}`;
  const body = req.method === 'GET' || req.method === 'DELETE' ? undefined : await req.text();
  const res = await fetch(url, {
    method: req.method,
    headers: { 'content-type': 'application/json', 'x-api-key': API_KEY },
    body,
    cache: 'no-store',
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}

type Ctx = { params: { path: string[] } };
export async function GET(req: NextRequest, { params }: Ctx) {
  return forward(req, params.path);
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return forward(req, params.path);
}
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return forward(req, params.path);
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return forward(req, params.path);
}
