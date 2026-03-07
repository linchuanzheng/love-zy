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
      return new Response(JSON.stringify({ error: '文件不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 处理 blob 数据，兼容不同格式
    let data;
    if (blob instanceof Uint8Array) {
      data = blob.buffer;
    } else if (blob instanceof ArrayBuffer) {
      data = blob;
    } else if (typeof blob.arrayBuffer === 'function') {
      data = await blob.arrayBuffer();
    } else if (blob && typeof blob === 'object' && blob._data) {
      data = blob._data;
    } else {
      throw new Error(`无法识别的 blob 类型: ${blob.constructor?.name}`);
    }

    const contentType = blob.metadata?.contentType || 'application/octet-stream';
    const size = blob.metadata?.size || data.byteLength;

    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': size,
        'Cache-Control': 'public, max-age=86400',
        'Content-Disposition': `inline; filename="${encodeURIComponent(key)}"`
      }
    });
  } catch (error) {
    console.error('[file] 错误:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};