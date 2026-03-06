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
    // 从 blob.metadata 中获取类型，如果没有则根据文件名猜测
    let contentType = blob.metadata?.contentType;
    if (!contentType) {
      const ext = key.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg'].includes(ext)) contentType = 'image/jpeg';
      else if (ext === 'png') contentType = 'image/png';
      else if (ext === 'gif') contentType = 'image/gif';
      else if (ext === 'webp') contentType = 'image/webp';
      else contentType = 'application/octet-stream';
    }

    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': data.byteLength,
        'Cache-Control': 'public, max-age=86400',
        'Content-Disposition': `inline; filename="${encodeURIComponent(key)}"`
      }
    });
  } catch (error) {
    console.error('File error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};