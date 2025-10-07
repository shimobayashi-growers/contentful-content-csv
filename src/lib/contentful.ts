import { createClient } from 'contentful-management';

// Rich Text形式に変換するヘルパー関数
function convertToRichText(text: string) {
  if (!text) {
    return {
      nodeType: 'document',
      data: {},
      content: [],
    };
  }

  // すでにRich Text形式かチェック
  if (typeof text === 'object' && text.nodeType === 'document') {
    return text;
  }

  // プレーンテキストをRich Text形式に変換
  const paragraphs = String(text).split('\n').filter((line) => line.trim());

  return {
    nodeType: 'document',
    data: {},
    content: paragraphs.map((paragraph) => ({
      nodeType: 'paragraph',
      data: {},
      content: [
        {
          nodeType: 'text',
          value: paragraph,
          marks: [],
          data: {},
        },
      ],
    })),
  };
}

export function getContentfulClient() {
  const accessToken = process.env.CONTENTFUL_MANAGEMENT_TOKEN;

  if (!accessToken) {
    throw new Error('CONTENTFUL_MANAGEMENT_TOKEN is not set');
  }

  return createClient({
    accessToken,
  });
}

export async function getSpace() {
  const spaceId = process.env.CONTENTFUL_SPACE_ID;

  if (!spaceId) {
    throw new Error('CONTENTFUL_SPACE_ID is not set');
  }

  const client = getContentfulClient();
  return await client.getSpace(spaceId);
}

export async function getEnvironment() {
  const environmentId = process.env.CONTENTFUL_ENVIRONMENT || 'master';
  const space = await getSpace();
  return await space.getEnvironment(environmentId);
}

// Spaceのデフォルトlocaleを取得
export async function getSpaceDefaultLocale(): Promise<string> {
  const environment = await getEnvironment();
  const locales = await environment.getLocales();
  const defaultLocale = locales.items.find((l) => l.default);
  return defaultLocale?.code || 'ja';
}

export async function getContentTypes() {
  const environment = await getEnvironment();
  const contentTypes = await environment.getContentTypes();

  return contentTypes.items.map((ct) => ({
    id: ct.sys.id,
    name: ct.name,
    description: ct.description,
    fields: ct.fields.map((field) => ({
      id: field.id,
      name: field.name,
      type: field.type,
      required: field.required || false,
      localized: field.localized || false,
    })),
  }));
}

export async function getEntries(
  contentTypeId: string,
  locale = 'ja-JP',
  selectedFields: string[] = []
) {
  const environment = await getEnvironment();

  let allEntries: any[] = [];
  let skip = 0;
  const limit = 100; // 1回のリクエストで取得する件数を減らす
  let hasMore = true;

  // ページネーションで全エントリーを取得
  while (hasMore) {
    const response = await environment.getEntries({
      content_type: contentTypeId,
      limit,
      skip,
    });

    allEntries = allEntries.concat(response.items);

    // 次のページがあるかチェック
    if (response.items.length < limit) {
      hasMore = false;
    } else {
      skip += limit;
    }

    // 安全のため、最大10000件で停止
    if (allEntries.length >= 10000) {
      break;
    }
  }

  return allEntries.map((entry) => {
    const fields: Record<string, any> = {};

    // 選択されたフィールドの順序を保持してエクスポート
    selectedFields.forEach((fieldId) => {
      if (fieldId === 'id') {
        fields.id = entry.sys.id;
      } else if (fieldId === 'createdAt') {
        fields.createdAt = entry.sys.createdAt;
      } else if (fieldId === 'updatedAt') {
        fields.updatedAt = entry.sys.updatedAt;
      } else if (entry.fields[fieldId] !== undefined) {
        const fieldValue = entry.fields[fieldId];

        // localeがある場合は展開
        if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
          if (locale in fieldValue) {
            // locale形式の値を取得
            const localeValue = fieldValue[locale];
            fields[fieldId] = serializeValue(localeValue);
          } else if (fieldValue.sys && fieldValue.sys.id) {
            // Contentful Reference (Link)
            fields[fieldId] = fieldValue.sys.id;
          } else {
            // その他のオブジェクト（Rich Textなど）
            fields[fieldId] = JSON.stringify(fieldValue);
          }
        } else if (Array.isArray(fieldValue)) {
          // 配列はJSON文字列化
          fields[fieldId] = JSON.stringify(fieldValue);
        } else {
          fields[fieldId] = fieldValue;
        }
      } else {
        // フィールドが存在しない場合は空文字
        fields[fieldId] = '';
      }
    });

    return fields;
  });
}

// 値をシリアライズするヘルパー関数
function serializeValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === 'object') {
    // Rich Textやその他のオブジェクト
    if (value.nodeType === 'document') {
      // Rich Textの場合、テキストコンテンツのみを抽出
      return extractRichTextContent(value);
    } else if (value.sys && value.sys.id) {
      // Reference (Link)
      return value.sys.id;
    } else {
      // その他のオブジェクトはJSON化
      return JSON.stringify(value);
    }
  }

  return String(value);
}

// Rich Textからテキストコンテンツを抽出
function extractRichTextContent(richText: any): string {
  if (!richText || !richText.content) {
    return '';
  }

  const extractText = (node: any): string => {
    if (node.nodeType === 'text') {
      return node.value || '';
    }

    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractText).join('');
    }

    return '';
  };

  return richText.content.map(extractText).join('\n');
}

export async function createOrUpdateEntry(
  contentTypeId: string,
  entryId: string | undefined,
  fields: Record<string, any>,
  locale = 'ja-JP'
) {
  const environment = await getEnvironment();

  // Content Typeのフィールド定義を取得
  const contentType = await environment.getContentType(contentTypeId);
  const fieldDefinitions = new Map(
    contentType.fields.map((field) => [field.id, field])
  );

  const localizedFields: Record<string, any> = {};

  Object.keys(fields).forEach((key) => {
    if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
      let value = fields[key];

      // フィールド定義を取得
      const fieldDef = fieldDefinitions.get(key);

      // Rich Textフィールドの場合、テキストを自動変換
      if (fieldDef && fieldDef.type === 'RichText') {
        // locale形式の場合は各localeの値を変換
        if (
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          Object.keys(value).some((k) => k === 'ja-JP' || k === 'en-US' || k.includes('-'))
        ) {
          const convertedValue: Record<string, any> = {};
          Object.keys(value).forEach((localeKey) => {
            convertedValue[localeKey] = convertToRichText(value[localeKey]);
          });
          localizedFields[key] = convertedValue;
          return;
        } else {
          // 通常のテキストの場合は変換してからlocaleでラップ
          value = convertToRichText(value);
        }
      }

      // Linkフィールド（Asset参照、Entry参照）の場合、文字列IDをLink形式に変換
      if (fieldDef && fieldDef.type === 'Link' && typeof value === 'string' && value) {
        const linkType = fieldDef.linkType || 'Asset'; // linkTypeを取得、デフォルトはAsset
        value = {
          sys: {
            type: 'Link',
            linkType: linkType,
            id: value,
          },
        };
      }

      // フィールド値がすでにlocale形式（オブジェクトでロケールキーを持つ）かチェック
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).some((k) => k === 'ja-JP' || k === 'en-US' || k.includes('-'))
      ) {
        // すでにlocale形式なのでそのまま使用
        localizedFields[key] = value;
      } else {
        // locale形式でない場合は、指定されたlocaleでラップ
        localizedFields[key] = {
          [locale]: value,
        };
      }
    }
  });

  if (entryId) {
    // IDが指定されている場合は更新を試みる
    try {
      console.log(`Attempting to update entry: ${entryId}`);
      const entry = await environment.getEntry(entryId);
      entry.fields = { ...entry.fields, ...localizedFields };
      const updated = await entry.update();
      await updated.publish();
      console.log(`Successfully updated entry: ${entryId}`);
      return updated;
    } catch (error: any) {
      // エントリーが見つからない場合は、新規作成にフォールバック
      if (error.status === 404 || error.statusText === 'Not Found') {
        console.log(`Entry ${entryId} not found, creating as new entry instead`);
        // 新規作成処理へ進む（entryIdをundefinedにして再帰呼び出し）
        return createOrUpdateEntry(contentTypeId, undefined, fields, locale);
      }
      console.error(`Failed to update entry ${entryId}:`, error.message);
      throw new Error(`Update failed for entry ${entryId}: ${error.message}`);
    }
  } else {
    // IDがない場合は新規作成（draft状態）
    try {
      console.log(`Creating new entry for content type: ${contentTypeId}`);
      const entry = await environment.createEntry(contentTypeId, {
        fields: localizedFields,
      });
      // 新規作成時はdraft状態のまま（publishしない）
      console.log(`Successfully created draft entry: ${entry.sys.id}`);
      return entry;
    } catch (error: any) {
      console.error(`Failed to create entry:`, error.message);
      throw new Error(`Create failed: ${error.message}`);
    }
  }
}

export async function getAssets(
  locale = 'ja-JP',
  selectedFields: string[] = [],
  maxLimit?: number
) {
  const environment = await getEnvironment();

  let allAssets: any[] = [];
  let skip = 0;
  const limit = 100;
  let hasMore = true;

  // ページネーションで全アセットを取得
  while (hasMore) {
    const response = await environment.getAssets({
      limit,
      skip,
    });

    allAssets = allAssets.concat(response.items);

    // 指定件数に達したら停止
    if (maxLimit && allAssets.length >= maxLimit) {
      allAssets = allAssets.slice(0, maxLimit);
      break;
    }

    // 次のページがあるかチェック
    if (response.items.length < limit) {
      hasMore = false;
    } else {
      skip += limit;
    }

    // 安全のため、最大10000件で停止
    if (allAssets.length >= 10000) {
      break;
    }
  }

  return allAssets.map((asset) => {
    const fields: Record<string, any> = {};

    // 選択されたフィールドの順序を保持してエクスポート
    selectedFields.forEach((fieldId) => {
      if (fieldId === 'id') {
        fields.id = asset.sys.id;
      } else if (fieldId === 'createdAt') {
        fields.createdAt = asset.sys.createdAt;
      } else if (fieldId === 'updatedAt') {
        fields.updatedAt = asset.sys.updatedAt;
      } else if (fieldId === 'title') {
        const titleField = asset.fields.title;
        fields.title = titleField && titleField[locale] ? titleField[locale] : '';
      } else if (fieldId === 'description') {
        const descField = asset.fields.description;
        fields.description = descField && descField[locale] ? descField[locale] : '';
      } else if (fieldId === 'fileName') {
        const fileField = asset.fields.file;
        fields.fileName = fileField && fileField[locale] && fileField[locale].fileName ? fileField[locale].fileName : '';
      } else if (fieldId === 'contentType') {
        const fileField = asset.fields.file;
        fields.contentType = fileField && fileField[locale] && fileField[locale].contentType ? fileField[locale].contentType : '';
      } else if (fieldId === 'url') {
        const fileField = asset.fields.file;
        fields.url = fileField && fileField[locale] && fileField[locale].url ? fileField[locale].url : '';
      } else if (fieldId === 'size') {
        const fileField = asset.fields.file;
        fields.size = fileField && fileField[locale] && fileField[locale].details && fileField[locale].details.size ? fileField[locale].details.size : '';
      } else if (fieldId === 'width') {
        const fileField = asset.fields.file;
        fields.width = fileField && fileField[locale] && fileField[locale].details && fileField[locale].details.image && fileField[locale].details.image.width ? fileField[locale].details.image.width : '';
      } else if (fieldId === 'height') {
        const fileField = asset.fields.file;
        fields.height = fileField && fileField[locale] && fileField[locale].details && fileField[locale].details.image && fileField[locale].details.image.height ? fileField[locale].details.image.height : '';
      } else {
        // 不明なフィールドは空文字
        fields[fieldId] = '';
      }
    });

    return fields;
  });
}

export async function updateAssetMetadata(
  assetId: string,
  fields: Record<string, any>,
  locale = 'ja-JP'
) {
  const environment = await getEnvironment();

  try {
    console.log(`Attempting to update asset: ${assetId}`);
    const asset = await environment.getAsset(assetId);

    // title と description のみ更新可能
    const localizedFields: Record<string, any> = { ...asset.fields };

    if (fields.title !== undefined) {
      localizedFields.title = {
        ...localizedFields.title,
        [locale]: fields.title,
      };
    }

    if (fields.description !== undefined) {
      localizedFields.description = {
        ...localizedFields.description,
        [locale]: fields.description,
      };
    }

    asset.fields = localizedFields;
    const updated = await asset.update();
    await updated.publish();
    console.log(`Successfully updated asset: ${assetId}`);
    return updated;
  } catch (error: any) {
    console.error(`Failed to update asset ${assetId}:`, error.message);
    throw new Error(`Update failed for asset ${assetId}: ${error.message}`);
  }
}

export async function createAsset(
  file: Buffer,
  fileName: string,
  contentType: string,
  title?: string,
  description?: string,
  locale = 'ja-JP'
) {
  try {
    console.log(`Creating asset: ${fileName}`);

    const environment = await getEnvironment();

    // 1. Upload file to Contentful Upload API
    const upload = await environment.createUpload({
      file,
    });

    console.log(`File uploaded with ID: ${upload.sys.id}`);

    // 2. Create asset and link to uploaded file
    const asset = await environment.createAsset({
      fields: {
        title: {
          [locale]: title || fileName,
        },
        description: description
          ? {
              [locale]: description,
            }
          : undefined,
        file: {
          [locale]: {
            contentType,
            fileName,
            uploadFrom: {
              sys: {
                type: 'Link',
                linkType: 'Upload',
                id: upload.sys.id,
              },
            },
          },
        },
      },
    });

    console.log(`Asset created with ID: ${asset.sys.id}`);

    // 3. Process the asset
    const processedAsset = await asset.processForLocale(locale, {
      processingCheckWait: 2000,
    });

    console.log(`Asset processed: ${processedAsset.sys.id}`);

    // 4. Publish the asset
    const publishedAsset = await processedAsset.publish();

    console.log(`Asset published: ${publishedAsset.sys.id}`);

    return publishedAsset;
  } catch (error: any) {
    console.error(`Failed to create asset ${fileName}:`, error.message);
    throw new Error(`Create asset failed for ${fileName}: ${error.message}`);
  }
}
