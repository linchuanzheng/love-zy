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

    console.log(`[file.js] 开始获取文件: ${key}`);

    const store = getStore('love-photos');
    const blob = await store.get(key);

    if (!blob) {
      console.log(`[file.js] 文件不存在: ${key}`);
      return new Response(JSON.stringify({ error: '文件不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查 blob 对象是否有 arrayBuffer 方法
    if (typeof blob.arrayBuffer !== 'function') {
      console.error(`[file.js] blob.arrayBuffer 不是函数，blob 类型:`, typeof blob, blob);
      return new Response(JSON.stringify({ error: '服务器错误：无效的文件对象' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await blob.arrayBuffer();
    const contentType = blob.metadata?.contentType || 'application/octet-stream';
    const size = blob.metadata?.size || data.byteLength;

    console.log(`[file.js] 成功获取文件: ${key}, 大小: ${size} bytes`);

    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': size,
        'Cache-Control': 'public, max-age=86400',
        'Content-Disposition': `inline; filename="${encodeURIComponent(key)}"`
      }
    });
  } catch (error) {
    console.error(`[file.js] 捕获到异常:`, error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};