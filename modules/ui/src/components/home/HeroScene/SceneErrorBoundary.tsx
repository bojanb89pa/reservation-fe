import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onError: () => void;
}

/** Catches lazy-load and render failures of the scene so the hero falls back to the static backdrop. */
export class SceneErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
