import { ServiceResponse } from '../types';

/**
 * A wrapper to safely execute API calls and enforce a standard response format.
 * Guarantees that errors are caught and returned as structured error objects,
 * preventing silent failures or empty mock data fallbacks in production.
 *
 * @param fetcher A function that returns a Promise (usually an apiFetch call)
 * @param errorMessage A custom error message to display if the fetch fails
 * @param mapData Optional function to transform the raw API response
 */
export async function safeFetch<T, R = T>(
    fetcher: () => Promise<T>,
    errorMessage: string,
    mapData?: (data: T) => R,
    signal?: AbortSignal
): Promise<ServiceResponse<R>> {
    try {
        if (signal?.aborted) {
            return { status: 'error', message: 'Request cancelled', error: 'Aborted' };
        }
        const response: any = await fetcher();

        // Check if the response itself indicates an error (if API returns 200 but with error field)
        if (response && response.error) {
            return {
                status: 'error',
                message: response.error,
                error: response
            };
        }

        // -------------------------------------------------------------------------
        // CONTRACT: AUTOMATIC UNWRAPPING
        // -------------------------------------------------------------------------
        // If the API returns { data: [...], count: N }, we automatically unwrap 'data'.
        // The callback 'mapData' receives the UNWRAPPED payload (e.g. the array).
        // checks are in place to warn if 'double unwrapping' is attempted.

        let finalData = response;
        let count = undefined;

        if (response && typeof response === 'object' && 'data' in response) {
            finalData = response.data;
            count = response.count;

            // Support for meta.total pagination style
            if (count === undefined && response.meta && typeof response.meta.total === 'number') {
                count = response.meta.total;
            }
        }

        // -------------------------------------------------------------------------
        // RUNTIME ASSERTION (Development Guardrail)
        // -------------------------------------------------------------------------
        // If 'finalData' STILL looks like a Supabase response (has .data array), 
        // it means we might have a nested response or a logic error.
        if (finalData && typeof finalData === 'object' && 'data' in finalData && Array.isArray(finalData.data)) {
            console.warn(`[SafeFetch] ⚠️ WARNING: Possible Double-Wrapped Response detected for ${errorMessage}.`);
            console.warn(`The 'mapData' function might be receiving { data: [] } instead of []. Check your backend response format.`);
        }

        // Apply mapping
        const payload = mapData ? mapData(finalData) : finalData;

        return {
            status: 'success',
            data: payload,
            count
        };

    } catch (error: any) {
        if (error.name === 'AbortError') {
            // Silent return for cancellation
            return { status: 'error', message: 'Request cancelled', error: 'Aborted' };
        }

        const msg = error.message || '';
        if (!msg.includes('Unauthorized') && !msg.includes('401') && !msg.includes('403')) {
            console.error(`[SafeFetch] Error: ${errorMessage}`, error);
        }

        // TODO: Add environment check here. 
        // If (DEV && MOCKS_ENABLED) -> return mock? 
        // For now, Strict Mode: Always return Error.

        return {
            status: 'error',
            message: `${errorMessage} (${error.message || 'Unknown'})`,
            error
        };
    }
}
