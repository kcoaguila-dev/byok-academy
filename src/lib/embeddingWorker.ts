import { pipeline, env } from '@xenova/transformers';

// Skip local model check since we're in the browser
env.allowLocalModels = false;

// We use the Singleton pattern for the embedding pipeline to ensure it's only loaded once
class PipelineSingleton {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static task: any = 'feature-extraction';
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance: unknown = null;

    static async getInstance(progress_callback?: (progress: unknown) => void) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    const { id, text, type } = event.data;

    try {
        if (type === 'load') {
            await PipelineSingleton.getInstance((x: unknown) => {
                self.postMessage({ id, status: 'progress', progress: x });
            });
            self.postMessage({ id, status: 'ready' });
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extractor: any = await PipelineSingleton.getInstance();
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        // The output is a Tensor. Convert it to a regular JS array.
        const embedding = Array.from(output.data);

        self.postMessage({
            id,
            status: 'complete',
            embedding
        });
    } catch (error: unknown) {
        self.postMessage({
            id,
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
