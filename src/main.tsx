import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProviders } from './app/AppProviders';
import { AuthProvider } from './features/auth/AuthProvider';
import { App } from './app/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppProviders>
        <AuthProvider><App /></AuthProvider>
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>,
);
