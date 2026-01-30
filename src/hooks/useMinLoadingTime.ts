import { useState, useEffect } from 'react';

/**
 * Hook that ensures a minimum loading time for better UX with loading animations.
 * Even if the actual loading completes quickly, this will keep isLoading true
 * until the minimum time has elapsed.
 * 
 * @param actualIsLoading - The real loading state from data fetching
 * @param minLoadingTime - Minimum time in ms to show loading (default: 2000ms)
 * @returns boolean - Whether to show the loading state
 */
export function useMinLoadingTime(actualIsLoading: boolean, minLoadingTime: number = 2000): boolean {
    const [showLoading, setShowLoading] = useState(true);
    const [loadingStartTime] = useState<number>(Date.now());
    const [minTimeElapsed, setMinTimeElapsed] = useState(false);

    useEffect(() => {
        // Set timer for minimum loading time
        const timer = setTimeout(() => {
            setMinTimeElapsed(true);
        }, minLoadingTime);

        return () => clearTimeout(timer);
    }, [minLoadingTime]);

    useEffect(() => {
        // Only stop showing loading when:
        // 1. Actual loading is complete AND
        // 2. Minimum time has elapsed
        if (!actualIsLoading && minTimeElapsed) {
            setShowLoading(false);
        }
    }, [actualIsLoading, minTimeElapsed]);

    return showLoading;
}

export default useMinLoadingTime;
