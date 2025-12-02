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
  private _hass?: any;

  set hass(value: any) {
    this._hass = value;
    this.render();
  }

  connectedCallback() {
    // Create container
    const container = document.createElement('div');
    container.style.height = '100%';
    container.style.width = '100%';
    this.appendChild(container);

    // Create root
    this.root = createRoot(container);
    this.render();
  }

  render() {
    if (!this.root) return;

    this.root.render(
      <React.StrictMode>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App hass={this._hass} />
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
