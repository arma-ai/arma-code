import { useState, useEffect } from 'react';

/**
 * useDebounce — delays updating a value until after the specified wait period.
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchQuery, 400);
 *   // Use debouncedSearch in effects / API calls instead of searchQuery
 *
 * @param value  The value to debounce (typically an input state variable)
 * @param delay  Delay in milliseconds (default: 300ms)
 */
export function useDebounce<T>(value: T, delay = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}
