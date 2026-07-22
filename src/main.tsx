import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { handleClientApiRequest } from './lib/firebaseClientApi';

// Transparent global fetch interceptor to solve Vercel/Cloudflare Pages/external hosting connectivity issues
try {
  const originalFetch = window.fetch;
  const devBackend = 'https://ais-dev-gpb5ge5lxgcdgusmu53hvc-1002434912097.asia-southeast1.run.app';
  const preBackend = 'https://ais-pre-gpb5ge5lxgcdgusmu53hvc-1002434912097.asia-southeast1.run.app';
  
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

  const interceptor = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let urlStr = '';

    if (input instanceof Request) {
      urlStr = input.url;
    } else if (input instanceof URL) {
      urlStr = input.toString();
    } else {
      urlStr = String(input);
    }

    const hostname = window.location.hostname;
    const isCloudRun = hostname.includes('run.app');
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    let isTargetApi = false;
    let relativePath = '';

    if (urlStr.startsWith('/') || !urlStr.startsWith('http')) {
      if (urlStr.includes('/api/v1/')) {
        isTargetApi = true;
        relativePath = urlStr.startsWith('/') ? urlStr : '/' + urlStr;
      }
    } else {
      try {
        const parsedUrl = new URL(urlStr);
        if (parsedUrl.pathname.includes('/api/v1/')) {
          isTargetApi = true;
          relativePath = parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
        }
      } catch (e) {
        // Handled safely
      }
    }

    // On Cloudflare Pages, Workers, Vercel or external domains (!isCloudRun && !isLocalhost)
    if (!isCloudRun && !isLocalhost && isTargetApi) {
      console.log(`[Firebase Client Routing] Direct operation for: ${relativePath}`);
      return handleClientApiRequest(relativePath, init);
    }

    // On CloudRun or Localhost, attempt original fetch, but fallback to client API if server returns 404 or fails
    try {
      const res = await originalFetch(input, init);
      if (isTargetApi && res.status === 404) {
        console.log(`[API Proxy] Backend returned 404 for ${relativePath}, falling back to Client API`);
        return handleClientApiRequest(relativePath, init);
      }
      return res;
    } catch (err) {
      if (isTargetApi) {
        console.warn(`[API Proxy] Fetch failed for ${relativePath}, falling back to Client API:`, err);
        return handleClientApiRequest(relativePath, init);
      }
      throw err;
    }
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
