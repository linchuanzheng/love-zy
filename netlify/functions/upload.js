import { getStore } from '@netlify/blobs';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) {
      return new Response('缺少文件', { status: 400 });
    }

    const filename = file.name;
    const fileBuffer = await file.arrayBuffer();

    const store = getStore('love-photos');
    await store.set(filename, new Uint8Array(fileBuffer), {
      metadata: {
        contentType: file.type,
        size: file.size,
        lastModified: new Date().toISOString()
      }
    });

    return new Response(JSON.stringify({ success: true, filename }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};