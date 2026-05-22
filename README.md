# BYOK Academy

**A 100% serverless, privacy-first, BYOK (Bring Your Own Key) AI learning platform.**

## Visual Interface

![Upload Dashboard](./public/screenshots/dashboard.png)
![Active Learning Interface](./public/screenshots/learning-loop.png)
![Syllabus Navigation](./public/screenshots/navigation.png)

BYOK Academy transforms your PDF documents into an interactive, AI-driven syllabus. By processing everything directly in your browser, it ensures your data remains yours—secure, private, and fully under your control.

## 🏗 The Architecture (How it Works)

BYOK Academy is built with a fundamentally different approach to modern AI applications: **There is NO backend database or server.**

*   **Local Processing:** All PDF parsing happens locally in your browser using Web Workers.
*   **Local State:** Your syllabus, progress, and settings are preserved entirely locally via IndexedDB (powered by `localforage`) and managed with `Zustand`.
*   **Direct AI Communication:** The application communicates directly with the official LLM endpoints (e.g., OpenAI) from your browser.

## ✨ Key Features

*   **Dynamic Syllabus Generation:** Upload a PDF and watch as the AI extracts core concepts and generates a structured, directed prerequisite graph tailored to your material.
*   **Multi-Chunk PDF Parsing:** Robust client-side parsing that seamlessly handles large documents by intelligently chunking text.
*   **Split-Screen Active Learning UI:** Read the source material on the left while actively testing your knowledge on the right.
*   **Real-Time AI Quiz Grading Loop:** Automatically generates quizzes based on the current concept, evaluates your answers, and provides instant, constructive feedback and hints.

## 🔒 Security & Privacy

Your privacy is the core design principle of BYOK Academy.
*   **No Centralized Servers:** Your API keys and document texts are **NEVER** sent to a centralized application server.
*   **Direct to Provider:** Data is only transmitted directly to the official LLM endpoints (e.g., OpenAI API) according to their secure protocols.
*   **BYOK (Bring Your Own Key):** You provide your own API key, which is securely stored only in your browser's local storage.

## 🛠 Tech Stack

*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **Framework:** [React](https://reactjs.org/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [TailwindCSS](https://tailwindcss.com/)
*   **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
*   **PDF Parsing:** [pdfjs-dist](https://mozilla.github.io/pdf.js/)

## 🚀 Getting Started (Local Dev)

To run BYOK Academy locally, clone the repository and follow these steps:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Start the local development server:**
    ```bash
    npm run dev
    ```

3.  Open your browser and navigate to the local URL provided in your terminal (usually `http://localhost:5173`).

## ☁️ Deployment

BYOK Academy is configured for seamless deployment. It automatically builds and deploys to **GitHub Pages** via GitHub Actions whenever changes are merged into the `main` branch.
