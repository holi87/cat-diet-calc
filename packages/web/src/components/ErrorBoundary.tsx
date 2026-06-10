import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Catches render errors so the app shows a recovery screen instead of a blank page. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center bg-gray-50 dark:bg-gray-900">
          <div className="text-4xl">😿</div>
          <div className="text-base font-semibold text-gray-700 dark:text-gray-200">
            Coś poszło nie tak
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2 rounded-lg text-sm"
          >
            Odśwież aplikację
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
