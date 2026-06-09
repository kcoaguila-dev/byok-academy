import { create, insertMultiple, search, save, load, type Orama } from '@orama/orama';
import { pipeline } from '@xenova/transformers';
import localforage from 'localforage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let oramaDb: Orama<any> | null = null;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const initIndex = async (): Promise<Orama<any>> => {
  if (oramaDb) return oramaDb;

  const getOramaConfig = () => ({
    schema: {
      text: 'string',
      documentId: 'string',
      embedding: 'vector[384]',
    },
  });

  try {
    const savedData = await storageAdapter.get(INDEX_KEY);
    if (savedData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      oramaDb = await create(getOramaConfig() as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await load(oramaDb, savedData as any);
      return oramaDb;
    }
  } catch (error) {
    console.error('Failed to restore Orama index from localforage', error);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oramaDb = await create(getOramaConfig() as any);

  return oramaDb;
};

export const indexDocument = async (chunks: string[], documentId: string): Promise<void> => {
  const db = await initIndex();
  const extract = await getExtractor();

  const documents = await Promise.all(
    chunks.map(async (chunk) => {
      const output = await extract(chunk, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data);
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
};

export const searchIndex = async (query: string, limit: number = 3) => {
  const db = await initIndex();
  const extract = await getExtractor();

  const output = await extract(query, { pooling: 'mean', normalize: true });
  const queryEmbedding = Array.from(output.data);

  const results = await search(db, {
    term: query,
    mode: 'hybrid',
    vector: {
      value: queryEmbedding as number[],
      property: 'embedding',
    },
    limit,
  });

  return results.hits.map(hit => hit.document);
};
