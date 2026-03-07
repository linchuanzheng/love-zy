import { getStore } from '@netlify/blobs';

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    if (!key) {
      return new Response(JSON.stringify({ error: '缺少 key 参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const store = getStore('love-photos');
    const blob = await store.get(key);
    if (!blob) {
      console.error(`文件不存在: ${key}`);
      return new Response(JSON.stringify({ error: '文件不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await blob.arrayBuffer();
    const contentType = blob.metadata?.contentType || 'application/octet-stream';
    const size = blob.metadata?.size || data.byteLength;

    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': size,
        'Cache-Control': 'public, max-age=86400',
        // 使浏览器直接显示图片而不是下载（但保留下载按钮触发的下载）
        'Content-Disposition': `inline; filename="${encodeURIComponent(key)}"`
      }
    });
  } catch (error) {
    console.error('file.js 错误:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};