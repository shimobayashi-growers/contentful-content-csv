'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface ContentType {
  id: string;
  name: string;
  description?: string;
}

interface ImportTabProps {
  contentTypes: ContentType[];
}

export function ImportTab({ contentTypes }: ImportTabProps) {
  const [selectedContentType, setSelectedContentType] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      setImportResult(null);
    } else {
      toast({
        title: 'エラー',
        description: 'CSVファイルを選択してください',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    if (!selectedContentType || !csvFile) {
      toast({
        title: 'エラー',
        description: 'Content TypeとCSVファイルを選択してください',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const csvData = await csvFile.text();

      const response = await fetch('/api/contentful/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentTypeId: selectedContentType,
          csvData,
          locale: 'ja-JP',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      setImportResult(result);

      toast({
        title: '完了',
        description: `${result.successCount}件のエントリーをインポートしました`,
      });
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'エラー',
        description: error.message || 'インポートに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>CSVからデータをインポート</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="content-type">Content Type</Label>
          <Select value={selectedContentType} onValueChange={setSelectedContentType}>
            <SelectTrigger id="content-type">
              <SelectValue placeholder="Content Typeを選択..." />
            </SelectTrigger>
            <SelectContent>
              {contentTypes.map((ct) => (
                <SelectItem key={ct.id} value={ct.id}>
                  {ct.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="csv-file">CSVファイル</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isImporting}
          />
          {csvFile && (
            <p className="text-sm text-muted-foreground">
              選択: {csvFile.name}
            </p>
          )}
        </div>

        <Button
          onClick={handleImport}
          disabled={!selectedContentType || !csvFile || isImporting}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          {isImporting ? 'インポート中...' : 'CSVをインポート'}
        </Button>

        {isImporting && (
          <div className="space-y-2">
            <Progress value={undefined} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              データを処理しています...
            </p>
          </div>
        )}

        {importResult && (
          <Alert>
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">インポート結果:</p>
                <p className="text-sm">合計: {importResult.total}件</p>
                <p className="text-sm text-green-600">
                  成功: {importResult.successCount}件
                </p>
                {importResult.errorCount > 0 && (
                  <>
                    <p className="text-sm text-red-600">
                      失敗: {importResult.errorCount}件
                    </p>
                    <details className="mt-2">
                      <summary className="text-sm cursor-pointer">
                        エラー詳細を表示
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs">
                        {importResult.results.errors.map(
                          (err: any, idx: number) => (
                            <li key={idx}>
                              Row {err.row}: {err.error}
                            </li>
                          )
                        )}
                      </ul>
                    </details>
                  </>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
