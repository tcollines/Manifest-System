import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
    children: ReactNode;
    /** Module name shown in the fallback UI */
    moduleName?: string;
    /** Optional custom fallback to render */
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ErrorBoundary — wraps each module/route.
 * Catches unhandled React render errors and shows a user-friendly fallback
 * instead of a blank white screen.
 *
 * Usage:
 *   <ErrorBoundary moduleName="Registration">
 *     <RegistrationLayout />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(`[ErrorBoundary] Caught in ${this.props.moduleName || 'unknown'}:`, error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md w-full">
                        <div className="flex justify-center mb-4">
                            <div className="bg-red-100 rounded-full p-3">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            {this.props.moduleName ? `${this.props.moduleName} Error` : 'Something went wrong'}
                        </h2>
                        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                            An unexpected error occurred in this section. Your other work is safe.
                        </p>
                        {this.state.error?.message && (
                            <pre className="text-xs text-red-400 bg-red-50 border border-red-100 rounded-lg p-3 mb-6 text-left overflow-auto max-h-24">
                                {this.state.error.message}
                            </pre>
                        )}
                        <button
                            onClick={this.handleReset}
                            className="inline-flex items-center gap-2 bg-ministry-text text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-ministry-orange transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
