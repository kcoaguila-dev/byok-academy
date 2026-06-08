import { create, insert, search } from '@orama/orama';

// Define the Orama DB schema
export type SearchSchema = {
    documentId: 'string';
    text: 'string';
};

let dbInstance: any = null;

export async function initializeDB() {
    if (dbInstance) return dbInstance;

    dbInstance = await create({
        schema: {
            documentId: 'string',
            text: 'string'
        }
    });
    return dbInstance;
}

export async function indexDocument(chunks: string[], documentId: string): Promise<void> {
    const db = await initializeDB();

    for (const chunk of chunks) {
        await insert(db, {
            documentId,
            text: chunk
        });
    }
}

export async function searchIndex(query: string, limit: number = 3): Promise<{text: string; documentId: string}[]> {
    const db = await initializeDB();

    if (!query.trim()) return [];

    const results = await search(db, {
        term: query,
        limit
    });

    return results.hits.map((hit: any) => ({
        text: hit.document.text,
        documentId: hit.document.documentId
    }));
}
