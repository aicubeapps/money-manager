import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

const rootElement = document.getElementById('root')!;

import('./App')
  .then(({ default: App }) => {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  })
  .catch((error) => {
    console.error('Failed to start the application:', error);
    rootElement.innerHTML =
      '<div style="padding:2rem;font-family:sans-serif;color:#b91c1c;">Failed to load the application. Please check the console for details.</div>';
  });