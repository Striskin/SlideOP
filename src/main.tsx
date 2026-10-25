import { StrictMode, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SlideOP editor error', error, info.componentStack);
  }
  render() {
    return this.state.failed ? (
      <div className="fatal-error">
        <h1>Let’s get you back to creating.</h1>
        <p>
          The editor ran into a problem. Your last saved local project is still in this browser.
        </p>
        <button onClick={() => location.reload()}>Reload SlideOP</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
