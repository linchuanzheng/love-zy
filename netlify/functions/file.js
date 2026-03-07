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

    // 处理不同类型的 blob
    let data;
    let contentType = blob.metadata?.contentType || 'application/octet-stream';

    // 情况1：Uint8Array (新照片)
    if (blob instanceof Uint8Array) {
      data = blob.buffer;
    }
    // 情况2：ArrayBuffer
    else if (blob instanceof ArrayBuffer) {
      data = blob;
    }
    // 情况3：有 arrayBuffer 方法 (标准 @netlify/blobs 返回)
    else if (typeof blob.arrayBuffer === 'function') {
      data = await blob.arrayBuffer();
      contentType = blob.metadata?.contentType || contentType;
    }
    // 情况4：字符串 (旧照片)
    else if (typeof blob === 'string') {
      // 记录字符串前50个字符，以便判断格式
      console.log(`[file] 字符串前50字符: ${blob.substring(0, 50)}`);

      // 尝试作为 base64 解码
      try {
        // 去除可能的 data URL 前缀
        const base64Data = blob.replace(/^data:image\/\w+;base64,/, '');
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        data = bytes.buffer;
        console.log('[file] 成功作为 base64 解码');
      } catch (e) {
        // base64 解码失败，回退到原始二进制字符串处理
        console.log('[file] base64 解码失败，尝试作为原始二进制字符串处理');
        const bytes = new Uint8Array(blob.length);
        for (let i = 0; i < blob.length; i++) {
          bytes[i] = blob.charCodeAt(i) & 0xFF; // 取低8位，确保在0-255
        }
        data = bytes.buffer;
      }

      // 根据文件名设置内容类型
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