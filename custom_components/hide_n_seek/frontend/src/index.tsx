import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { App } from './App';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196F3',
    },
    secondary: {
      main: '#FF9800',
    },
  },
});

// Define custom element for Home Assistant panel
class HideNSeekPanel extends HTMLElement {
  private root?: Root;

  connectedCallback() {
    // Create shadow root for style isolation (optional)
    const container = document.createElement('div');
    container.style.height = '100%';
    container.style.width = '100%';
    this.appendChild(container);

    // Mount React app
    this.root = createRoot(container);
    this.root.render(
      <React.StrictMode>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </React.StrictMode>
    );
  }

  disconnectedCallback() {
    // Cleanup when panel is removed
    if (this.root) {
      this.root.unmount();
    }
  }
}

// Register custom element
customElements.define('hide-n-seek-panel', HideNSeekPanel);
