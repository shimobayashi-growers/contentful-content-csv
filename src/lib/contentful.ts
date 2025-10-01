import { createClient } from 'contentful-management';

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

export async function getEntries(contentTypeId: string, locale = 'ja-JP') {
  const environment = await getEnvironment();
  const entries = await environment.getEntries({
    content_type: contentTypeId,
    limit: 1000,
  });

  return entries.items.map((entry) => {
    const fields: Record<string, any> = {
      id: entry.sys.id,
      createdAt: entry.sys.createdAt,
      updatedAt: entry.sys.updatedAt,
    };

    Object.keys(entry.fields).forEach((fieldId) => {
      const fieldValue = entry.fields[fieldId];

      if (fieldValue && typeof fieldValue === 'object' && locale in fieldValue) {
        fields[fieldId] = fieldValue[locale];
      } else {
        fields[fieldId] = fieldValue;
      }
    });

    return fields;
  });
}

export async function createOrUpdateEntry(
  contentTypeId: string,
  entryId: string | undefined,
  fields: Record<string, any>,
  locale = 'ja-JP'
) {
  const environment = await getEnvironment();

  const localizedFields: Record<string, any> = {};

  Object.keys(fields).forEach((key) => {
    if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
      localizedFields[key] = {
        [locale]: fields[key],
      };
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
