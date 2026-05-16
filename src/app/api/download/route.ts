import { NextResponse } from 'next/server';
import { createReadStream, statSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const uploadDir = join(process.cwd(), 'upload');
    if (!existsSync(uploadDir)) {
      return NextResponse.json({ error: 'No upload dir' }, { status: 404 });
    }
    const files = readdirSync(uploadDir)
      .filter((f) => f.endsWith('.zip'))
      // Sort by modification time, most recent first
      .map((f) => ({ name: f, mtime: statSync(join(uploadDir, f)).mtime.getTime() }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No zip found' }, { status: 404 });
    }

    const filename = files[0].name;
    const filePath = join(uploadDir, filename);
    const fileSize = statSync(filePath).size;

    // Stream the file instead of loading entire content into memory
    // This prevents OOM on large zip files
    const stream = createReadStream(filePath);

    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(fileSize),
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
