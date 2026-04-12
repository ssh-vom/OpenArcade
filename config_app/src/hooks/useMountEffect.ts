import { useEffect } from "react";

/**
 * useMountEffect - For external system synchronization only.
 * 
 * Use this when you need to:
 * - Subscribe to browser APIs (window events, visibility, etc.)
 * - Initialize third-party libraries (Three.js, charts, etc.)
 * - Set up non-React integrations
 * 
 * DO NOT use for:
 * - Deriving state from props (compute at render instead)
 * - Data fetching (use TanStack Query)
 * - Event handling (handle in event handlers)
 * - Resetting state when props change (use key prop instead)
 */
export function useMountEffect(effect: () => void | (() => void)) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(effect, []);
}
