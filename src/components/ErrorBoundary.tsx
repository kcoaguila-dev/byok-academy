import React, { type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (msg: string) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: React.ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error.message);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-xl border border-red-200">
          <h2 className="text-xl font-bold text-red-800 mb-4">Something went wrong</h2>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
