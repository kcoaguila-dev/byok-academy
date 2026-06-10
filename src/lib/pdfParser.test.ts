import { describe, it, expect, vi } from 'vitest';
import { extractTextFromPdf } from './pdfParser';
import * as pdfjsLib from 'pdfjs-dist';

// Mock pdfjs-dist BEFORE importing it in the test implementation
// or let vitest handle it via vi.mock
vi.mock('pdfjs-dist', () => {
  return {
    getDocument: vi.fn(),
    GlobalWorkerOptions: {
      workerSrc: ''
    },
    version: '1.0.0'
  };
});

describe('extractTextFromPdf', () => {
  it('should extract text from a single-page PDF', async () => {
    (pdfjsLib.getDocument as any).mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: () => Promise.resolve({
          getTextContent: () => Promise.resolve({
            items: [{ str: 'Hello World' }]
          })
        })
      })
    });

    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    const result = await extractTextFromPdf(file);

    expect(result).toEqual(['Hello World']);
  });

  it('should extract text from a multi-page PDF', async () => {
    (pdfjsLib.getDocument as any).mockReturnValue({
      promise: Promise.resolve({
        numPages: 2,
        getPage: (pageNum: number) => Promise.resolve({
          getTextContent: () => Promise.resolve({
            items: [{ str: `Page ${pageNum} content` }]
          })
        })
      })
    });

    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    const result = await extractTextFromPdf(file);

    expect(result).toEqual(['Page 1 content', 'Page 2 content']);
  });

  it('should handle items without a "str" property gracefully', async () => {
    (pdfjsLib.getDocument as any).mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: () => Promise.resolve({
          getTextContent: () => Promise.resolve({
            items: [{ str: 'Valid text' }, { someOtherProp: 'Invalid' }, { str: 'More valid text' }]
          })
        })
      })
    });

    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    const result = await extractTextFromPdf(file);

    expect(result).toEqual(['Valid text  More valid text']);
  });

  it('should call onProgress with correct percentages', async () => {
    (pdfjsLib.getDocument as any).mockReturnValue({
      promise: Promise.resolve({
        numPages: 2,
        getPage: () => Promise.resolve({
          getTextContent: () => Promise.resolve({
            items: [{ str: 'Test content' }]
          })
        })
      })
    });

    const progressCalls: number[] = [];
    const onProgress = (progress: number) => {
      progressCalls.push(progress);
    };

    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    await extractTextFromPdf(file, onProgress);

    expect(progressCalls).toEqual([50, 100]);
  });
});
