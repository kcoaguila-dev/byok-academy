import { create, insert, search, type Orama } from '@orama/orama';
import '@orama/plugin-embeddings'; // Not strictly needed when doing custom embeddings, but good to have
import localforage from 'localforage';
import { chunkText } from './chunker';

// Define the Orama DB schema
export type RAGSchema = {
    text: 'string';
    embedding: 'vector[384]'; // all-MiniLM-L6-v2 outputs 384-dimensional vectors
};

type MyOramaDB = Orama<RAGSchema>;

let dbInstance: MyOramaDB | null = null;
let workerInstance: Worker | null = null;

// Worker promise wrapper to handle message correlation
let messageIdCounter = 0;
const pendingRequests = new Map<number, { resolve: (res: unknown) => void; reject: (err: unknown) => void }>();

function getWorker(): Worker {
    if (!workerInstance) {
        workerInstance = new Worker(new URL('./embeddingWorker.ts', import.meta.url), {
            type: 'module'
        });

        workerInstance.onmessage = (event) => {
            const { id, status, embedding, error } = event.data;
            const handlers = pendingRequests.get(id);
            if (!handlers) return; // Could be a progress message we don't track

            if (status === 'complete') {
                handlers.resolve(embedding);
                pendingRequests.delete(id);
            } else if (status === 'error') {
                handlers.reject(new Error(error));
                pendingRequests.delete(id);
            } else if (status === 'ready') {
                handlers.resolve(true);
                pendingRequests.delete(id);
            }
        };
    }
    return workerInstance;
}

async function getEmbedding(text: string): Promise<number[]> {
    const worker = getWorker();
    const id = messageIdCounter++;
    return new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pendingRequests.set(id, { resolve: resolve as any, reject });
        worker.postMessage({ id, text, type: 'embed' });
    });
}

export async function preloadModel(): Promise<void> {
    const worker = getWorker();
    const id = messageIdCounter++;
    return new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pendingRequests.set(id, { resolve: resolve as any, reject });
        worker.postMessage({ id, type: 'load' });
    });
}

export async function initializeDB(): Promise<MyOramaDB> {
    if (dbInstance) return dbInstance;

    const loaded = await loadIndex();
    if (loaded && dbInstance) {
        return dbInstance;
    }

    dbInstance = await create({
        schema: {
            text: 'string',
            embedding: 'vector[384]'
        }
    });
    return dbInstance;
}

export async function saveIndex(): Promise<void> {
    if (!dbInstance) return;

    try {
        const { save } = await import('@orama/orama');
        const serialized = await save(dbInstance);
        await localforage.setItem('orama_rag_index', serialized);
    } catch (e) {
        console.error("Failed to save RAG index:", e);
    }
}

export async function loadIndex(): Promise<boolean> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const serialized = await localforage.getItem<any>('orama_rag_index');
        if (serialized) {
            const { load } = await import('@orama/orama');
            dbInstance = await create({
                schema: {
                    text: 'string',
                    embedding: 'vector[384]'
                }
            });
            await load(dbInstance, serialized);
            return true;
        }
    } catch (e) {
        console.error("Failed to load RAG index:", e);
    }
    return false;
}

export async function indexDocument(text: string | string[], onProgress?: (p: number) => void): Promise<void> {
    const db = await initializeDB();

    // Flatten text into a single array of strings
    const texts = Array.isArray(text) ? text : [text];

    // Chunk all texts
    let chunks: string[] = [];
    for (const t of texts) {
        chunks = chunks.concat(chunkText(t, 1000)); // slightly smaller chunks for better RAG
    }

    let processed = 0;
    const total = chunks.length;

    for (const chunk of chunks) {
        const embedding = await getEmbedding(chunk);
        await insert(db, {
            text: chunk,
            embedding
        });
        processed++;
        if (onProgress) {
            onProgress(Math.round((processed / total) * 100));
        }
    }

    await saveIndex();
}

export async function searchIndex(query: string, limit: number = 3): Promise<string[]> {
    const db = await initializeDB();

    // Empty query
    if (!query.trim()) return [];

    const queryEmbedding = await getEmbedding(query);

    const results = await search(db, {
        mode: 'vector',
        vector: {
            value: queryEmbedding,
            property: 'embedding'
        },
        limit,
        similarity: 0.1 // adjust threshold if needed
    });

    return results.hits.map(hit => hit.document.text as string);
}

export function getDBInstance() {
    return dbInstance;
}
