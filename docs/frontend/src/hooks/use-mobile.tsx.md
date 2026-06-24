# frontend/src/hooks/use-mobile.tsx

> **Source File:** [frontend/src/hooks/use-mobile.tsx](https://github.com/quelizlifetech/UltraHand/blob/main/frontend/src/hooks/use-mobile.tsx)
> **Repository:** `UltraHand`
> **Branch:** `main`

# frontend/src/hooks/use-mobile.tsx

### Overview
This file defines a React hook, `useIsMobile`, which provides a boolean indicating whether the current viewport width is considered "mobile" based on a predefined breakpoint. It is designed to facilitate responsive UI rendering.

### Architecture & Role
This file resides in the `frontend/src/hooks` directory, indicating its role as a reusable utility within the React component layer. It functions at the presentation layer, providing reactive state for UI components to adapt their layout or content based on screen size, contributing to the application's responsive design.

### Key Components
*   `MOBILE_BREAKPOINT`: A constant set to `768`, defining the maximum pixel width for a "mobile" viewport.
*   `useIsMobile`: A custom React hook that manages and exposes the mobile state. It uses `React.useState` to hold the boolean state and `React.useEffect` to set up and tear down a `window.matchMedia` listener.

### Execution Flow / Behavior
1.  When `useIsMobile` is called, it initializes a state variable `isMobile` to `undefined`.
2.  A `React.useEffect` hook runs once on component mount.
3.  Inside `useEffect`, it creates a `MediaQueryList` using `window.matchMedia` for a maximum width of `MOBILE_BREAKPOINT - 1` pixels (767px).
4.  An `onChange` event listener is defined, which updates the `isMobile` state based on `window.innerWidth < MOBILE_BREAKPOINT`.
5.  This `onChange` listener is attached to the `MediaQueryList` and immediately invoked to set the initial `isMobile` state.
6.  The `useEffect` cleanup function ensures the event listener is removed from the `MediaQueryList` when the component unmounts.
7.  The hook returns `!!isMobile`, coercing the state to a boolean, handling the initial `undefined` state.

### Dependencies
*   `react`: Provides the core `useState` and `useEffect` hooks for managing component state and lifecycle.
*   Browser APIs: `window.matchMedia` and `window.innerWidth` are used to determine the current viewport characteristics and listen for changes.

### Design Notes
*   The use of `window.matchMedia` provides an efficient way to react to viewport size changes without relying on `resize` event listeners directly on `window`, which can be less performant.
*   The `isMobile` state is initially `undefined`. The `!!isMobile` return ensures a boolean value is always provided, gracefully handling the initial render before the media query listener has had a chance to set the initial state. This also implicitly handles environments where `window` might not be available (e.g., SSR) by returning `false` initially, though the `useEffect` will only execute client-side.
*   The `MOBILE_BREAKPOINT` constant centralizes the definition of what constitutes a "mobile" viewport, making it easier to maintain consistency across the application. The `max-width: ${MOBILE_BREAKPOINT - 1}px` in `matchMedia` and `window.innerWidth < MOBILE_BREAKPOINT` ensures the breakpoint behavior is consistent.

### Diagram
None significant.