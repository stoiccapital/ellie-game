import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { hydrateFromCloud, startCloudAutosave } from './lib/cloudSync';

async function boot() {
  await hydrateFromCloud();
  startCloudAutosave();
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void boot();
