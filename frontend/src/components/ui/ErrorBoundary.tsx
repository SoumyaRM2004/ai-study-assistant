import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="glass-card flex flex-col items-center justify-center p-8 text-center border-red-500/20 max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 font-bold text-xl">
            !
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-2">Something went wrong</h3>
          <p className="text-sm text-slate-400 mb-6">
            An error occurred while loading this section. Please try refreshing or clicking below.
          </p>
          {this.state.error && (
            <pre className="w-full text-left p-3 rounded-lg bg-slate-950 text-red-400 text-xs overflow-x-auto mb-6 max-h-36">
              {this.state.error.toString()}
            </pre>
          )}
          <button onClick={this.handleReset} className="btn-primary py-2 px-4 text-xs">
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
