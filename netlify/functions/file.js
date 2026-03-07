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

    // ----- 核心修改：处理不同类型的 blob -----
    let data;
    let contentType = blob.metadata?.contentType || 'application/octet-stream';
    
    // 情况1：blob 是 Uint8Array (新上传的照片)
    if (blob instanceof Uint8Array) {
      data = blob.buffer;
    }
    // 情况2：blob 是 ArrayBuffer
    else if (blob instanceof ArrayBuffer) {
      data = blob;
    }
    // 情况3：blob 有 arrayBuffer 方法 (@netlify/blobs 的标准返回)
    else if (typeof blob.arrayBuffer === 'function') {
      data = await blob.arrayBuffer();
      contentType = blob.metadata?.contentType || contentType;
    }
    // 情况4：blob 是 String (旧照片可能以 Base64 或纯文本存储)
    else if (typeof blob === 'string') {
      // 假设字符串内容是 Base64 编码的图片数据
      // 注意：如果存储的是原始文本，这里需要根据实际情况调整
      const base64Data = blob.replace(/^data:image\/\w+;base64,/, '');
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      data = bytes.buffer;
      // 尝试从文件名推断 Content-Type
      const ext = key.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg'].includes(ext)) contentType = 'image/jpeg';
      else if (ext === 'png') contentType = 'image/png';
      else if (ext === 'gif') contentType = 'image/gif';
      else if (ext === 'webp') contentType = 'image/webp';
    }
    else {
      throw new Error(`无法处理的 blob 类型: ${blob.constructor?.name}`);
    }

    const size = data.byteLength;

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