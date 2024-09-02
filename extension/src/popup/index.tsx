import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';
import React from 'react';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
