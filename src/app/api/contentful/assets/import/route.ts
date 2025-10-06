import { NextRequest, NextResponse } from 'next/server';
import { createAsset, getSpaceDefaultLocale } from '@/lib/contentful';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      );
    }

    if (files.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 files allowed' },
        { status: 400 }
      );
    }

    // Auto-detect Space's default locale
    const targetLocale = await getSpaceDefaultLocale();
    console.log(`Using locale: ${targetLocale}`);

    const results = {
      success: [] as string[],
      errors: [] as { fileName: string; error: string }[],
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        console.log(`Processing file ${i + 1}/${files.length}: ${file.name}`);

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Remove file extension from title
        const titleWithoutExtension = file.name.replace(/\.[^/.]+$/, '');

        // Create asset in Contentful
        const asset = await createAsset(
          buffer,
          file.name,
          file.type,
          titleWithoutExtension, // Use filename without extension as title
          undefined, // No description
          targetLocale
        );

        results.success.push(asset.sys.id);
        console.log(`Successfully uploaded: ${file.name} (${asset.sys.id})`);
      } catch (error: any) {
        console.error(`Failed to upload ${file.name}:`, error.message);
        results.errors.push({
          fileName: file.name,
          error: error.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: 'Upload completed',
      results,
      total: files.length,
      successCount: results.success.length,
      errorCount: results.errors.length,
    });
  } catch (error: any) {
    console.error('Error uploading assets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload assets' },
      { status: 500 }
    );
  }
}
