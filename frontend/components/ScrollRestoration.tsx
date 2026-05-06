import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Custom ScrollRestoration component to handle window scroll state on route changes.
 * Fixes layout stability by replacing nested div scrollbars with native body scroll.
 */
export default function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();

  // Disable native browser scroll restoration globally
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    return () => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

  useEffect(() => {
    // Let browser handle POP navigation natively (Back/Forward)
    if (navigationType === 'POP') return;
    
    // Ignore hash navigation to avoid jumping to the top of the page when navigating to a specific section
    if (location.hash) return;

    // Use requestAnimationFrame to avoid visual flashes and handle async mounting gracefully
    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto',
      });

      // Manage accessibility focus securely
      const mainContent = document.getElementById('main-content');
      mainContent?.focus({ preventScroll: true });
    });
  }, [location.key, navigationType, location.hash]);

  return null;
}
