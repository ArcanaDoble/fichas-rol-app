import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'       // <- importa Tailwind + tu CSS
import 'react-tooltip/dist/react-tooltip.css'
import App from './App';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { ConfirmProvider } from './components/Confirm';
import reportWebVitals from './reportWebVitals';

// Si hay Service Workers registrados (de versiones antiguas PWA), los eliminamos
// para forzar que el navegador use siempre el contenido fresco del servidor.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </DndProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

