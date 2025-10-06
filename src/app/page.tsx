import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportTab } from '@/components/export-tab';
import { ImportTab } from '@/components/import-tab';
import { AssetExportTab } from '@/components/asset-export-tab';
import { AssetImportTab } from '@/components/asset-import-tab';
import { getContentTypes } from '@/lib/contentful';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let contentTypes = [];
  let error = null;

  try {
    contentTypes = await getContentTypes();
  } catch (e: any) {
    error = e.message;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-8">
            <h1 className="text-4xl font-bold tracking-tight">
              Contentful CSV Manager
            </h1>
            <p className="text-muted-foreground">
              Contentfulのデータをブラウザ上でCSVインポート・エクスポート
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-2">
              接続エラー
            </h2>
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <div className="text-sm text-red-800">
              <p className="font-medium mb-2">確認事項:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>.env.local ファイルが存在するか</li>
                <li>CONTENTFUL_SPACE_ID が設定されているか</li>
                <li>CONTENTFUL_MANAGEMENT_TOKEN が設定されているか</li>
                <li>トークンが有効か</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Contentful CSV Manager
          </h1>
          <p className="text-muted-foreground">
            Contentfulのデータをブラウザ上でCSVインポート・エクスポート
          </p>
        </div>

        {contentTypes.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">
              Content Typeが見つかりません
            </h2>
            <p className="text-sm text-yellow-700">
              Contentful SpaceにまだContent Typeが作成されていません。
              <br />
              Contentfulの管理画面からContent Typeを作成してください。
            </p>
          </div>
        ) : (
          <Tabs defaultValue="entry-export" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="entry-export">エントリーエクスポート</TabsTrigger>
              <TabsTrigger value="entry-import">エントリーインポート</TabsTrigger>
              <TabsTrigger value="asset-export">アセットエクスポート</TabsTrigger>
              <TabsTrigger value="asset-import">アセットインポート</TabsTrigger>
            </TabsList>

            <TabsContent value="entry-export" className="mt-6">
              <ExportTab contentTypes={contentTypes} />
            </TabsContent>

            <TabsContent value="entry-import" className="mt-6">
              <ImportTab contentTypes={contentTypes} />
            </TabsContent>

            <TabsContent value="asset-export" className="mt-6">
              <AssetExportTab />
            </TabsContent>

            <TabsContent value="asset-import" className="mt-6">
              <AssetImportTab />
            </TabsContent>
          </Tabs>
        )}

        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>Next.js + Contentful Management API + shadcn/ui</p>
        </footer>
      </div>
    </main>
  );
}
