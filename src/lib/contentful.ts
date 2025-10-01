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
    try {
      const entry = await environment.getEntry(entryId);
      entry.fields = { ...entry.fields, ...localizedFields };
      const updated = await entry.update();
      await updated.publish();
      return updated;
    } catch (error) {
      console.error(`Failed to update entry ${entryId}:`, error);
      throw error;
    }
  } else {
    const entry = await environment.createEntry(contentTypeId, {
      fields: localizedFields,
    });
    await entry.publish();
    return entry;
  }
}
