import { NextRequest, NextResponse } from 'next/server';
import { getAssets, getSpaceDefaultLocale } from '@/lib/contentful';
import { convertToCSV } from '@/lib/csv';

export async function POST(request: NextRequest) {
  try {
    const { locale, selectedFields, limit } = await request.json();

    console.log('Asset export request:', { locale, selectedFields, limit });

    if (!selectedFields || selectedFields.length === 0) {
      return NextResponse.json(
        { error: 'At least one field must be selected' },
        { status: 400 }
      );
    }

    // Auto-detect Space's default locale if not provided
    const targetLocale = locale || await getSpaceDefaultLocale();
    console.log(`Using locale: ${targetLocale}`);

    const assets = await getAssets(targetLocale, selectedFields, limit);

    if (assets.length === 0) {
      return NextResponse.json(
        { error: 'No assets found' },
        { status: 404 }
      );
    }

    // CSV変換（すでにフィールド選択済み）
    const csv = convertToCSV(assets, false);

    // ファイル名を日時形式（yyyymmddhhmmss）で生成
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `assets_${timestamp}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=${filename}`,
      },
    });
  } catch (error) {
    console.error('Error exporting assets:', error);
    return NextResponse.json(
      { error: 'Failed to export assets' },
      { status: 500 }
    );
  }
}
