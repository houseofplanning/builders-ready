import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'builders-ready-web',
    time: new Date().toISOString(),
  });
}
