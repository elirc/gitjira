import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { App } from './App.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import { queryClient } from './lib/queryClient.js';
import { initTheme } from './lib/theme.js';
// Design-system tokens + component styles load once, at the root.
import '@gitjira/ui/tokens.css';
import '@gitjira/ui/components.css';
import './styles.css';

// Apply the saved theme before first paint — no flash of the wrong theme.
initTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
        {/* LEARN: devtools render the cache live — open them and watch queries
            go stale, refetch, and get invalidated. The single best way to build
            intuition for what TanStack Query is doing. Dev-only. */}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
