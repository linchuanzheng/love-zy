import { getStore } from '@netlify/blobs';

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    if (!key) {
      return new Response('缺少 key 参数', { status: 400 });
    }

    const store = getStore('love-photos');
    const blob = await store.get(key);
    if (!blob) {
      return new Response('文件不存在', { status: 404 });
    }

    const data = await blob.arrayBuffer();
    const contentType = blob.metadata?.contentType || 'application/octet-stream';
    const size = blob.metadata?.size || data.byteLength;

    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': size,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};