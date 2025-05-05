import { NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { unfurl as unfurlUrl } from 'unfurl.js';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

export async function PUT(request: Request) {
  const id = request.url.split('/').pop();
  if (!id) return new NextResponse('Invalid ID', { status: 400 });
  
  const data = await request.arrayBuffer();
  await writeFile(join(UPLOADS_DIR, id), Buffer.from(data));
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  
  if (url.pathname.includes('/uploads/')) {
    const id = url.pathname.split('/').pop();
    if (!id) return new NextResponse('Invalid ID', { status: 400 });
    
    const data = await readFile(join(UPLOADS_DIR, id));
    return new NextResponse(data);
  }
  
  if (url.pathname.includes('/unfurl')) {
    const urlToUnfurl = url.searchParams.get('url');
    if (!urlToUnfurl) return new NextResponse('Invalid URL', { status: 400 });
    
    try {
      const result = await unfurlUrl(urlToUnfurl);
      return NextResponse.json({
        title: result.title,
        description: result.description,
        image: result.open_graph?.images?.[0]?.url,
        favicon: result.favicon,
      });
    } catch (error) {
      console.error('Error unfurling URL:', error);
      return NextResponse.json(null);
    }
  }
  
  return new NextResponse('Not found', { status: 404 });
} 