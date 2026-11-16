import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './app/store';
import { I18nProvider } from './i18n';
import App from './App';
import './styles/globals.css';
import './styles/components.css';
import './styles/auth.css';
import './styles/theme-dark.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <I18nProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </I18nProvider>
    </Provider>
  </React.StrictMode>,
);


if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}


let installEvent: BeforeInstallPromptEvent | null = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installEvent = event as BeforeInstallPromptEvent;
  window.dispatchEvent(new CustomEvent('pwa-installable'));
});

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

window.addEventListener('pwa-install-request', () => {
  if (installEvent) {
    void installEvent.prompt();
    installEvent = null;
  }
});
