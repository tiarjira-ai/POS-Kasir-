import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { handleClientApiRequest } from './lib/firebaseClientApi';

// Transparent global fetch interceptor to solve Vercel/external hosting connectivity issues
try {
  const originalFetch = window.fetch;
  const devBackend = 'https://ais-dev-awltrufj3vwffphxl6cpwr-1002434912097.asia-southeast1.run.app';
  const preBackend = 'https://ais-pre-awltrufj3vwffphxl6cpwr-1002434912097.asia-southeast1.run.app';
  
  // Retrieve last known good backend from localStorage, default to devBackend
  let activeBackendUrl = devBackend;
  try {
    const cachedBackend = localStorage.getItem('wdspos_active_backend');
    if (cachedBackend && (cachedBackend === devBackend || cachedBackend === preBackend)) {
      activeBackendUrl = cachedBackend;
    }
  } catch (err) {
    // LocalStorage might be disabled in some sandboxes
  }

  // Probe both backends asynchronously to self-heal and pick the responsive one
  const probeBackend = async (url: string) => {
    try {
      const res = await originalFetch(`${url}/api/v1/health`, { method: 'GET', mode: 'cors' });
      if (res.ok) {
        activeBackendUrl = url;
        try {
          localStorage.setItem('wdspos_active_backend', url);
        } catch (_) {}
        console.log('[API Proxy] Active backend confirmed:', url);
        return true;
      }
    } catch (e) {
      // Offline or CORS blocked
    }
    return false;
  };

  // Run probes in the background
  probeBackend(devBackend).then((success) => {
    if (!success) {
      probeBackend(preBackend);
    }
  });

  const interceptor = function (input: RequestInfo | URL, init?: RequestInit) {
    let urlStr = '';
    let isRequestObject = false;
    let requestObj: Request | null = null;

    if (input instanceof Request) {
      urlStr = input.url;
      isRequestObject = true;
      requestObj = input;
    } else if (input instanceof URL) {
      urlStr = input.toString();
    } else {
      urlStr = String(input);
    }

    const hostname = window.location.hostname;
    const isCloudRun = hostname.includes('run.app');
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // If we are hosted on an external domain like Vercel or Cloudflare Workers
    if (!isCloudRun && !isLocalhost) {
      let isTargetApi = false;
      let relativePath = '';

      if (urlStr.startsWith('/') || !urlStr.startsWith('http')) {
        // It's a relative path, e.g. "/api/v1/employees" or "api/v1/employees"
        if (urlStr.includes('/api/v1/')) {
          isTargetApi = true;
          relativePath = urlStr.startsWith('/') ? urlStr : '/' + urlStr;
        }
      } else {
        // It's an absolute path, check if it points to the current frontend host but contains the API path
        try {
          const parsedUrl = new URL(urlStr);
          if (parsedUrl.origin === window.location.origin && parsedUrl.pathname.includes('/api/v1/')) {
            isTargetApi = true;
            relativePath = parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
          }
        } catch (e) {
          // Handled safely
        }
      }

      if (isTargetApi) {
        console.log(`[Firebase Client Routing] Direct Firestore operation for: ${relativePath}`);
        return handleClientApiRequest(relativePath, init);
      }
    }

    return originalFetch(input, init);
  };

  try {
    Object.defineProperty(window, 'fetch', {
      value: interceptor,
      configurable: true,
      writable: true,
      enumerable: true
    });
  } catch (err) {
    (window as any).fetch = interceptor;
  }
} catch (e) {
  console.warn('Transparent fetch interceptor skipped:', e);
}

// Register PWA Service Worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered successfully with scope:', reg.scope);
      })
      .catch((err) => {
        console.error('[PWA] Service Worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
