import React from 'react';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // You can hook this to a logging service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    // Reset boundary and try rendering children again
    this.setState({ hasError: false, error: undefined });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-7xl font-extrabold text-luxury-gold drop-shadow">500</h1>
          <p className="mt-4 text-2xl font-semibold text-luxury-champagne">Something went wrong</p>
          {this.state.error && (
            <p className="mt-2 text-gray-400 max-w-2xl text-sm">{this.state.error.message}</p>
          )}
          <div className="mt-8 flex gap-3">
            <button className="btn-primary" onClick={this.handleReset}>Try Again</button>
            <button className="btn-secondary" onClick={() => window.location.reload()}>Reload Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
