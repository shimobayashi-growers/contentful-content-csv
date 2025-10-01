'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Field {
  id: string;
  name: string;
  type: string;
  required: boolean;
}

interface ContentType {
  id: string;
  name: string;
  description?: string;
  fields?: Field[];
}

interface ExportTabProps {
  contentTypes: ContentType[];
}

export function ExportTab({ contentTypes }: ExportTabProps) {
  const [selectedContentType, setSelectedContentType] = useState<string>('');
  const [availableFields, setAvailableFields] = useState<Field[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>(['id', 'createdAt', 'updatedAt']);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const { toast } = useToast();

  // Content Type選択時にフィールド一覧を取得
  useEffect(() => {
    if (selectedContentType) {
      fetchFields(selectedContentType);
    } else {
      setAvailableFields([]);
      setSelectedFields(['id', 'createdAt', 'updatedAt']);
    }
  }, [selectedContentType]);

  const fetchFields = async (contentTypeId: string) => {
    setIsLoadingFields(true);
    try {
      const response = await fetch('/api/contentful/content-types');
      const data = await response.json();

      const contentType = data.contentTypes.find((ct: ContentType) => ct.id === contentTypeId);
      if (contentType && contentType.fields) {
        setAvailableFields(contentType.fields);
        // デフォルトで全フィールドを選択
        setSelectedFields(['id', 'createdAt', 'updatedAt', ...contentType.fields.map((f: Field) => f.id)]);
      }
    } catch (error) {
      console.error('Error fetching fields:', error);
      toast({
        title: 'エラー',
        description: 'フィールド情報の取得に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingFields(false);
    }
  };

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const toggleAll = () => {
    if (selectedFields.length === availableFields.length + 3) {
      setSelectedFields(['id', 'createdAt', 'updatedAt']);
    } else {
      setSelectedFields(['id', 'createdAt', 'updatedAt', ...availableFields.map((f) => f.id)]);
    }
  };

  const handleExport = async () => {
    if (!selectedContentType) {
      toast({
        title: 'エラー',
        description: 'Content Typeを選択してください',
        variant: 'destructive',
      });
      return;
    }

    if (selectedFields.length === 0) {
      toast({
        title: 'エラー',
        description: '少なくとも1つのフィールドを選択してください',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch('/api/contentful/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentTypeId: selectedContentType,
          locale: 'ja-JP',
          selectedFields,
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
      let filename = `${selectedContentType}_${new Date().toISOString().split('T')[0]}.csv`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match) filename = match[1];
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>データをCSVにエクスポート</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Content Type</Label>
          <Select value={selectedContentType} onValueChange={setSelectedContentType}>
            <SelectTrigger>
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

        {selectedContentType && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>エクスポートするフィールド</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                disabled={isLoadingFields}
              >
                {selectedFields.length === availableFields.length + 3 ? '全て解除' : '全て選択'}
              </Button>
            </div>

            {isLoadingFields ? (
              <div className="text-sm text-muted-foreground">読み込み中...</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
                {/* システムフィールド */}
                <div className="space-y-2 pb-2 border-b">
                  <p className="text-xs font-medium text-muted-foreground">システムフィールド</p>
                  {['id', 'createdAt', 'updatedAt'].map((fieldId) => (
                    <div key={fieldId} className="flex items-center space-x-2">
                      <Checkbox
                        id={fieldId}
                        checked={selectedFields.includes(fieldId)}
                        onCheckedChange={() => toggleField(fieldId)}
                      />
                      <label
                        htmlFor={fieldId}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {fieldId}
                      </label>
                    </div>
                  ))}
                </div>

                {/* コンテンツフィールド */}
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-medium text-muted-foreground">コンテンツフィールド</p>
                  {availableFields.map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.id}
                        checked={selectedFields.includes(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                      />
                      <label
                        htmlFor={field.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                      >
                        {field.name}
                        <span className="text-xs text-muted-foreground ml-2">({field.type})</span>
                        {field.required && (
                          <span className="text-xs text-red-500 ml-1">*</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              選択中: {selectedFields.length} フィールド
            </div>
          </div>
        )}

        <Button
          onClick={handleExport}
          disabled={!selectedContentType || selectedFields.length === 0 || isExporting}
          className="w-full"
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? 'エクスポート中...' : 'CSVをダウンロード'}
        </Button>
      </CardContent>
    </Card>
  );
}
