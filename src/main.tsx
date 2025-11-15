import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { unregisterServiceWorkers } from './utils/unregisterServiceWorker'

// Unregister any existing service workers to prevent caching issues
unregisterServiceWorkers().catch(console.error);

createRoot(document.getElementById("root")!).render(<App />);
