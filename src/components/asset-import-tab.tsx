'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

const MAX_FILES = 20;

export function AssetImportTab() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // 画像ファイルのみフィルタリング
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast({
        title: 'エラー',
        description: '画像ファイルを選択してください',
        variant: 'destructive',
      });
      return;
    }

    if (selectedFiles.length + imageFiles.length > MAX_FILES) {
      toast({
        title: 'エラー',
        description: `最大${MAX_FILES}件までアップロードできます`,
        variant: 'destructive',
      });
      return;
    }

    setSelectedFiles((prev) => [...prev, ...imageFiles]);
    setUploadResult(null);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: 'エラー',
        description: 'ファイルを選択してください',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/contentful/assets/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadResult(result);
      setUploadProgress(100);

      toast({
        title: '完了',
        description: `${result.successCount}件のアセットをアップロードしました`,
      });

      // 成功後、ファイルリストをクリア
      setSelectedFiles([]);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'エラー',
        description: error.message || 'アップロードに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>画像ファイルをアップロード</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          ※ 最大{MAX_FILES}件まで同時にアップロードできます
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-upload">画像ファイル</Label>
          <Input
            id="file-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={isUploading || selectedFiles.length >= MAX_FILES}
          />
          <p className="text-xs text-muted-foreground">
            選択中: {selectedFiles.length} / {MAX_FILES}件
          </p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <Label>選択されたファイル</Label>
            <div className="border rounded-md p-3 max-h-96 overflow-y-auto space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded-md"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <ImageIcon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || isUploading}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          {isUploading ? 'アップロード中...' : 'アップロード開始'}
        </Button>

        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              ファイルをアップロードしています...
            </p>
          </div>
        )}

        {uploadResult && (
          <Alert>
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">アップロード結果:</p>
                <p className="text-sm">合計: {uploadResult.total}件</p>
                <p className="text-sm text-green-600">
                  成功: {uploadResult.successCount}件
                </p>
                {uploadResult.errorCount > 0 && (
                  <>
                    <p className="text-sm text-red-600">
                      失敗: {uploadResult.errorCount}件
                    </p>
                    <details className="mt-2">
                      <summary className="text-sm cursor-pointer">
                        エラー詳細を表示
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs">
                        {uploadResult.results.errors.map(
                          (err: any, idx: number) => (
                            <li key={idx}>
                              {err.fileName}: {err.error}
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
