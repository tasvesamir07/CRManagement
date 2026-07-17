import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackMessage?: string;
  showError?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-accent-tomato/10 flex items-center justify-center mb-4">
            <span className="text-2xl text-accent-tomato">!</span>
          </div>
          <h2 className="text-lg font-semibold text-ink mb-2">Something went wrong</h2>
          <p className="text-sm text-ink-mute mb-4 max-w-md">
            {this.props.fallbackMessage || 'An unexpected error occurred. Please try refreshing the page.'}
          </p>
          {this.props.showError && this.state.error && (
            <pre className="text-xs text-accent-tomato bg-accent-tomato/5 p-3 rounded mb-4 max-w-md overflow-auto">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm hover:bg-primary-deep transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
