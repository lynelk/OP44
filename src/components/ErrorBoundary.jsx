import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { captureError } from '@/lib/monitoring';

/**
 * ErrorBoundary — ISO/IEC 27001 / app store compliance
 * Catches unhandled React render errors and presents a safe recovery UI
 * instead of exposing raw stack traces to end users.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorId: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true, errorId: `ERR-${Date.now()}` };
  }

  componentDidCatch(error, info) {
    // Log to console and report to monitoring (no-op unless Sentry is configured).
    console.error('[Pipiya ErrorBoundary]', error, info);
    captureError(error, { componentStack: info?.componentStack, errorId: this.state.errorId });
  }

  handleReset = () => {
    this.setState({ hasError: false, errorId: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen bg-gray-50 flex items-center justify-center px-5"
          role="alert"
          aria-live="assertive"
        >
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-500 mb-1 leading-relaxed">
              We encountered an unexpected error. Your data is safe.
            </p>
            <p className="text-xs text-gray-400 mb-6">Reference: {this.state.errorId}</p>
            <button
              onClick={this.handleReset}
              className="w-full bg-[#006B3C] text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-[#005530] transition-colors"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Return to Home
            </button>
            <a
              href="mailto:support@pipiya.ug"
              className="block mt-3 text-xs text-[#006B3C] underline"
            >
              Contact support@pipiya.ug
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}