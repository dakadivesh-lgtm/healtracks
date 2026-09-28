import React, { Component } from 'react';

export default class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[GlobalErrorBoundary] Uncaught React Error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F8FAF9',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '24px'
        }}>
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8E3',
            borderRadius: '20px',
            padding: '40px 32px',
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#FEF2F2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              margin: '0 auto 20px'
            }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: '1.5', marginBottom: '24px' }}>
              An unexpected application error occurred. You can return to the dashboard to continue safely.
            </p>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details style={{ textAlign: 'left', background: '#F1F5F9', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '11px', color: '#334155', overflowX: 'auto' }}>
                <summary style={{ fontWeight: 600, cursor: 'pointer', marginBottom: '6px' }}>Error Details (Dev mode)</summary>
                <code>{this.state.error.toString()}</code>
              </details>
            )}

            <button
              type="button"
              onClick={this.handleReload}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                background: '#153C2E',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
