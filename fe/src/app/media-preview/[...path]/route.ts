import type { NextRequest } from 'next/server';

const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8000';

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const forwardedResponseHeaders = [
  'accept-ranges',
  'cache-control',
  'content-disposition',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
] as const;

const mediaTypes: Record<string, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  pdf: 'application/pdf',
};

async function proxyMedia(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  if (!path.length || path.some((segment) => segment === '.' || segment === '..')) {
    return new Response('Đường dẫn tài liệu không hợp lệ.', { status: 400 });
  }

  const safePath = path.map((segment) => encodeURIComponent(segment)).join('/');
  const upstreamUrl = `${BACKEND_INTERNAL_URL}/media/${safePath}${request.nextUrl.search}`;
  const requestHeaders = new Headers();
  for (const name of ['range', 'if-range', 'if-none-match', 'if-modified-since']) {
    const value = request.headers.get(name);
    if (value) requestHeaders.set(name, value);
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers: requestHeaders,
      cache: 'no-store',
    });
    const responseHeaders = new Headers();
    for (const name of forwardedResponseHeaders) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    const extension = path.at(-1)?.split('.').pop()?.toLowerCase();
    if (extension && mediaTypes[extension]) {
      responseHeaders.set('content-type', mediaTypes[extension]);
    }

    return new Response(request.method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response('Không thể kết nối tới kho tài liệu.', { status: 502 });
  }
}

export const GET = proxyMedia;
export const HEAD = proxyMedia;
