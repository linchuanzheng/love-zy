import { getStore } from '@netlify/blobs';

export default async () => {
  try {
    const store = getStore('love-photos');
    const result = await store.list();
    let files = [];

    // 情况1：result 是异步迭代器（可使用 for await...of）
    if (result && typeof result[Symbol.asyncIterator] === 'function') {
      for await (const blob of result) {
        files.push({
          key: blob.key,
          metadata: blob.metadata || {}
        });
      }
    }
    // 情况2：result 是对象且包含 blobs 数组
    else if (result && Array.isArray(result.blobs)) {
      files = result.blobs.map(blob => ({
        key: blob.key,
        metadata: blob.metadata || {}
      }));
    }
    else {
      throw new Error('无法解析 store.list() 的返回值');
    }

    return new Response(JSON.stringify(files), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};