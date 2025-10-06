'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Field {
  id: string;
  name: string;
  category: 'system' | 'metadata' | 'file';
}

const AVAILABLE_FIELDS: Field[] = [
  { id: 'id', name: 'ID', category: 'system' },
  { id: 'createdAt', name: '作成日時', category: 'system' },
  { id: 'updatedAt', name: '更新日時', category: 'system' },
  { id: 'title', name: 'タイトル', category: 'metadata' },
  { id: 'description', name: '説明', category: 'metadata' },
  { id: 'fileName', name: 'ファイル名', category: 'file' },
  { id: 'contentType', name: 'コンテンツタイプ', category: 'file' },
  { id: 'url', name: 'URL', category: 'file' },
  { id: 'size', name: 'サイズ', category: 'file' },
  { id: 'width', name: '幅', category: 'file' },
  { id: 'height', name: '高さ', category: 'file' },
];

export function AssetExportTab() {
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'id',
    'title',
    'fileName',
    'url',
    'createdAt',
    'updatedAt',
  ]);
  const [limit, setLimit] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const toggleAll = () => {
    if (selectedFields.length === AVAILABLE_FIELDS.length) {
      setSelectedFields(['id', 'createdAt', 'updatedAt']);
    } else {
      setSelectedFields(AVAILABLE_FIELDS.map((f) => f.id));
    }
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast({
        title: 'エラー',
        description: '少なくとも1つのフィールドを選択してください',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    console.log('Exporting assets with fields:', selectedFields);

    try {
      const limitNumber = limit ? parseInt(limit, 10) : undefined;

      const response = await fetch('/api/contentful/assets/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // locale will be auto-detected from Space settings
          selectedFields,
          limit: limitNumber,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // ファイル名はサーバーから返されるContent-Dispositionを使用
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'assets.csv';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: '成功',
        description: 'CSVファイルをダウンロードしました',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'エラー',
        description: 'エクスポートに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getFieldsByCategory = (category: Field['category']) => {
    return AVAILABLE_FIELDS.filter((f) => f.category === category);
  };

  const categoryLabels = {
    system: 'システムフィールド',
    metadata: 'メタデータ',
    file: 'ファイル情報',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>アセットをCSVにエクスポート</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="limit">エクスポート件数（空欄で全件）</Label>
          <Input
            id="limit"
            type="number"
            placeholder="例: 100"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            min="1"
          />
          <p className="text-xs text-muted-foreground">
            件数を指定しない場合は全件エクスポートします（最大10,000件）
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>エクスポートするフィールド</Label>
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {selectedFields.length === AVAILABLE_FIELDS.length
                ? '全て解除'
                : '全て選択'}
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto border rounded-md p-3">
            {(['system', 'metadata', 'file'] as const).map((category) => (
              <div key={category} className="space-y-2 pb-2 border-b last:border-b-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {categoryLabels[category]}
                </p>
                {getFieldsByCategory(category).map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => toggleField(field.id)}
                    />
                    <label
                      htmlFor={field.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {field.name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({field.id})
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground">
            選択中: {selectedFields.length} フィールド
          </div>
        </div>

        <Button
          onClick={handleExport}
          disabled={selectedFields.length === 0 || isExporting}
          className="w-full"
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? 'エクスポート中...' : 'CSVをダウンロード'}
        </Button>
      </CardContent>
    </Card>
  );
}
