import { useState, useEffect, useRef, useCallback } from 'react';

interface AsyncState<T> {
    data: T | null;
    error: Error | null;
    loading: boolean;
}

interface UseSafeAsyncOptions {
    onSuccess?: (data: any) => void;
    onError?: (error: Error) => void;
}

/**
 * A hook to execute async functions safely with:
 * 1. Automatic cancellation of in-flight requests on unmount or new request
 * 2. Protection against state updates on unmounted components
 * 3. Standardized loading/error state
 */
export const useSafeAsync = <T = any>(options?: UseSafeAsyncOptions) => {
    const [state, setState] = useState<AsyncState<T>>({
        data: null,
        error: null,
        loading: false,
    });

    const isMounted = useRef(true);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const run = useCallback(async (promiseOrFn: Promise<T> | ((signal: AbortSignal) => Promise<T>)) => {
        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            let data: T;
            if (typeof promiseOrFn === 'function') {
                data = await promiseOrFn(controller.signal);
            } else {
                data = await promiseOrFn;
            }

            if (isMounted.current && !controller.signal.aborted) {
                setState({ data, error: null, loading: false });
                if (options?.onSuccess) options.onSuccess(data);
                return data;
            }
        } catch (error: any) {
            // Ignore abort errors
            if (error.name === 'AbortError' || controller.signal.aborted) {
                return;
            }

            console.error("Async Error:", error);

            if (isMounted.current) {
                const errObj = error instanceof Error ? error : new Error(String(error));
                setState({ data: null, error: errObj, loading: false });
                if (options?.onError) options.onError(errObj);
            }
        }
        return null;
    }, [options]);

    // Manually cancel
    const cancel = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    return { ...state, run, cancel, isMounted };
};
