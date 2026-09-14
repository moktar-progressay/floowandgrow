import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProviders } from './app/AppProviders';
import { AuthProvider } from './features/auth/AuthProvider';
import { App } from './app/App';
import { AppErrorBoundary } from './app/AppErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppErrorBoundary>
        <AppProviders>
          <AuthProvider><App /></AuthProvider>
        </AppProviders>
      </AppErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
);
