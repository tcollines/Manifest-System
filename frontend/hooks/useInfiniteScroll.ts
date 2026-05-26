import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions<T> {
  fetchData: (page: number) => Promise<T[]>;
  initialPage?: number;
  threshold?: number;
}

export function useInfiniteScroll<T>({
  fetchData,
  initialPage = 1,
  threshold = 0.5
}: UseInfiniteScrollOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(async (pageToLoad: number) => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const newItems = await fetchData(pageToLoad);
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setData(prev => (pageToLoad === initialPage ? newItems : [...prev, ...newItems]));
        setPage(pageToLoad + 1);
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchData, isLoading, hasMore, initialPage]);

  // Initial load
  useEffect(() => {
    setData([]);
    setPage(initialPage);
    setHasMore(true);
    
    // We don't call loadMore directly here because it depends on the current state.
    // Instead we reset state, and the caller can either rely on the sentinel to trigger 
    // the first load (if it's immediately visible) or call initial load explicitly.
    // However, it's safer to just load the first page automatically on mount/refresh.
    setIsLoading(true);
    fetchData(initialPage)
        .then(newItems => {
            setData(newItems);
            setPage(initialPage + 1);
            if (newItems.length === 0) setHasMore(false);
        })
        .catch(err => setError(err))
        .finally(() => setIsLoading(false));
        
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]); // Only re-run when fetchData function reference changes (e.g., filters applied)

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore(page);
      }
    }, { threshold });

    if (node) observer.current.observe(node);
  }, [isLoading, hasMore, loadMore, page, threshold]);

  const reset = useCallback(async () => {
    setData([]);
    setPage(initialPage);
    setHasMore(true);
    setError(null);
    setIsLoading(true);
    try {
        const newItems = await fetchData(initialPage);
        setData(newItems);
        setPage(initialPage + 1);
        if (newItems.length === 0) setHasMore(false);
    } catch (err: any) {
        setError(err);
    } finally {
        setIsLoading(false);
    }
  }, [initialPage, fetchData]);

  return {
    data,
    isLoading,
    hasMore,
    error,
    sentinelRef,
    reset,
    setData // Expose setter for optimistic updates
  };
}
