import { create, insertMultiple, removeMultiple, search, save, load, type Orama, type SearchParams, type RawData, type TypedDocument } from '@orama/orama';
import { pipeline } from '@xenova/transformers';
import localforage from 'localforage';

export let activeDocumentId: string | null = null;

export const setActiveDocumentId = (id: string | null): void => {
  activeDocumentId = id;
};

export const oramaSchema = {
  text: 'string',
  documentId: 'string',
  embedding: 'vector[384]',
} as const;

export type AppOrama = Orama<typeof oramaSchema>;

let oramaDb: AppOrama | null = null;
let extractor: unknown = null;

const getExtractor = async () => {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: false,
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return extractor as (...args: unknown[]) => Promise<any>;
};

export const warmupEmbeddingModel = async (): Promise<void> => {
  try {
    await getExtractor();
  } catch (e) {
    // Resolve silently on failure
    console.error('Failed to warmup embedding model', e);
  }
};

const INDEX_KEY = 'orama_index';

// Simple in-memory persistence adapter for localforage
const storageAdapter = {
  async set(key: string, value: unknown): Promise<void> {
    await localforage.setItem(key, value);
  },
  async get(key: string): Promise<unknown | null> {
    return await localforage.getItem(key);
  },
  async del(key: string): Promise<void> {
    await localforage.removeItem(key);
  }
};

const getOramaConfig = () => ({
  schema: oramaSchema,
});

export const initIndex = async (): Promise<AppOrama> => {
  if (oramaDb) return oramaDb;

  try {
    const savedData = await storageAdapter.get(INDEX_KEY);
    if (savedData) {
      oramaDb = await create(getOramaConfig());
      await load(oramaDb, savedData as RawData);
      return oramaDb;
    }
  } catch (error) {
    console.error('Failed to restore Orama index from localforage', error);
  }

  oramaDb = await create(getOramaConfig());

  return oramaDb;
};

export const deleteDocumentIndex = async (documentId: string): Promise<void> => {
  const db = await initIndex();
  const results = await search(db, {
    term: '', // empty term matches all when filtering
    where: { documentId },
    limit: 100000
  });

  const ids = results.hits.map(h => h.id);
  if (ids.length > 0) {
    await removeMultiple(db, ids);
    try {
      const serializedData = await save(db);
      await storageAdapter.set(INDEX_KEY, serializedData);
    } catch (error) {
      console.error('Failed to persist Orama index after deletion', error);
    }
  }
};

export const indexDocument = async (chunks: string[], documentId: string, onProgress?: (percent: number) => void): Promise<void> => {
  const db = await initIndex();
  await deleteDocumentIndex(documentId);
  const extract = await getExtractor();

  let processed = 0;
  const total = chunks.length;

  const documents = await Promise.all(
    chunks.map(async (chunk) => {
      const output = await extract(chunk, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data) as number[];
      processed++;
      if (onProgress) {
        onProgress(Math.round((processed / total) * 100));
      }
      return {
        text: chunk,
        documentId,
        embedding,
      };
    })
  );

  // For simplicity, we just insert. In a real app we might want to clear old docs first
  // if re-indexing the same documentId.
  await insertMultiple(db, documents);

  try {
    const serializedData = await save(db);
    await storageAdapter.set(INDEX_KEY, serializedData);
  } catch (error) {
    console.error('Failed to persist Orama index to localforage', error);
  }

  if (onProgress) {
    onProgress(100);
  }
};

export const searchIndex = async (query: string, limit: number = 3, documentId?: string) => {
  const db = await initIndex();
  const extract = await getExtractor();

  const output = await extract(query, { pooling: 'mean', normalize: true });
  const queryEmbedding = Array.from(output.data) as number[];

  const searchParams: SearchParams<AppOrama, TypedDocument<AppOrama>> = {
    term: query,
    mode: 'hybrid',
    vector: {
      value: queryEmbedding,
      property: 'embedding',
    },
    limit,
  };

  if (documentId) {
    searchParams.where = { documentId };
  }

  const results = await search(db, searchParams);

  return results.hits.map(hit => hit.document);
};
