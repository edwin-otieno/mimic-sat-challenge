/**
 * Unregisters any existing service workers
 * This fixes issues where old service workers cache stale assets
 */
export const unregisterServiceWorkers = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      for (const registration of registrations) {
        console.log('Unregistering service worker:', registration.scope);
        await registration.unregister();
      }
      
      // Also try to clear the cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      console.log('Service workers unregistered successfully');
    } catch (error) {
      console.error('Error unregistering service workers:', error);
    }
  }
};

