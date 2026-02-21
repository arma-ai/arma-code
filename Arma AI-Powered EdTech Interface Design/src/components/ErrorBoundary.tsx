import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Errors are captured in state via getDerivedStateFromError.
    // Add external error reporting here if needed (e.g. Sentry).
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--foreground, #e5e7eb)',
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '1rem',
            padding: '2.5rem',
            maxWidth: '480px',
            width: '100%',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              color: 'var(--foreground, #f3f4f6)',
            }}>
              Something went wrong
            </h2>
            <p style={{
              fontSize: '0.95rem',
              color: 'var(--muted-foreground, #9ca3af)',
              marginBottom: '1.5rem',
              lineHeight: 1.6,
            }}>
              An unexpected error occurred. Please try again.
            </p>
            {this.state.error && (
              <p style={{
                fontSize: '0.8rem',
                color: 'rgba(239, 68, 68, 0.8)',
                fontFamily: 'monospace',
                padding: '0.75rem',
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem',
                wordBreak: 'break-word',
              }}>
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '0.95rem',
                fontWeight: 500,
                color: '#fff',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
