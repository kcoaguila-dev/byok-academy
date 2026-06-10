# BYOK Academy

**A 100% serverless, privacy-first, BYOK (Bring Your Own Key) AI learning platform.**

## 🚀 How to Use (No Setup Required)

You can access the live, fully-functional web app directly from your browser:
**[https://kcoaguila-dev.github.io/byok-academy/](https://kcoaguila-dev.github.io/byok-academy/)**

To get started:
1. Open the link above.
2. Click **API Settings** in the top right to securely enter your OpenAI API key.
3. Upload any educational PDF document.
4. The AI will generate an interactive syllabus and learning environment directly in your browser.

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

*   **Multi-Provider LLM Support:** Seamlessly connect to OpenAI, Anthropic, Gemini, or use local models.
*   **Dynamic Syllabus & Prerequisite Graph:** Upload a PDF to automatically generate a structured learning path with enforced prerequisites.
*   **Multi-Course Library:** Manage and switch between multiple courses and subjects effortlessly.
*   **RAG-Augmented Quizzes:** Experience real-time AI quiz grading powered by Retrieval-Augmented Generation for highly contextual feedback.
*   **Split-Screen Active Learning:** Display source PDF passages directly alongside your interactive learning environment.
*   **Mobile-Responsive Layout:** Learn on the go with a fully responsive interface.

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
*   **Vector Search:** Orama
*   **Embeddings:** all-MiniLM-L6-v2
*   **IndexedDB Persistence:** localforage

## 💻 For Developers (Local Setup)

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
