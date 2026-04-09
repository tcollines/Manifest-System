import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
    /** Size in pixels (default 24) */
    size?: number;
    /** Text shown below the spinner */
    message?: string;
    /** If true, takes up full available height (for page-level loading) */
    fullPage?: boolean;
    className?: string;
}

/**
 * LoadingSpinner — centralised loading indicator.
 * Use this instead of scattered inline <Loader2 className="animate-spin"> patterns.
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 24,
    message,
    fullPage = false,
    className = '',
}) => {
    const content = (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <Loader2
                className="animate-spin text-ministry-orange"
                style={{ width: size, height: size }}
            />
            {message && (
                <p className="text-sm text-gray-500 font-medium">{message}</p>
            )}
        </div>
    );

    if (fullPage) {
        return (
            <div className="flex items-center justify-center w-full min-h-[400px]">
                {content}
            </div>
        );
    }

    return content;
};

export default LoadingSpinner;
