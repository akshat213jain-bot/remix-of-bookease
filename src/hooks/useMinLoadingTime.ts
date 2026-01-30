import { useState, useEffect, useRef } from 'react';

/**
 * Hook that ensures a minimum loading time for better UX with loading animations.
 * ALWAYS shows loading immediately on mount to prevent content flash.
 * Even if the actual loading completes quickly, this will keep isLoading true
 * until the minimum time has elapsed.
 * 
 * @param actualIsLoading - The real loading state from data fetching
 * @param minLoadingTime - Minimum time in ms to show loading (default: 2000ms)
 * @returns boolean - Whether to show the loading state
 */
export function useMinLoadingTime(actualIsLoading: boolean, minLoadingTime: number = 2000): boolean {
    // Always start showing loading - this prevents any flash of content
    const [showLoading, setShowLoading] = useState(true);
    const mountTimeRef = useRef<number>(Date.now());
    const hasStartedLoadingRef = useRef(false);

    // Track when actual loading starts
    if (actualIsLoading && !hasStartedLoadingRef.current) {
        hasStartedLoadingRef.current = true;
    }

    useEffect(() => {
        // If still actually loading, keep showing loading
        if (actualIsLoading) {
            return;
        }

        // Calculate remaining time to show loading screen
        const elapsedTime = Date.now() - mountTimeRef.current;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

        if (remainingTime > 0) {
            // Wait for remaining time before hiding loading screen
            const timer = setTimeout(() => {
                setShowLoading(false);
            }, remainingTime);
            return () => clearTimeout(timer);
        } else {
            // Minimum time has elapsed, hide loading screen
            setShowLoading(false);
        }
    }, [actualIsLoading, minLoadingTime]);

    // Always return true initially to prevent any content flash
    return showLoading;
}

export default useMinLoadingTime;
