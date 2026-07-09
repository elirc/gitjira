import { Component } from 'react';

// LEARN: React only catches render errors in a CLASS component's
// componentDidCatch — there's no hook equivalent. One boundary near the root
// turns a white screen of death into a recoverable message. Placed per-route
// so one broken page doesn't take down the whole app.
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // In sprint 15 this is where Sentry.captureException goes.
    console.error('Render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <h1>Something went wrong</h1>
          <p>This screen hit an error. Try reloading; if it persists, it’s on us.</p>
          <button onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
