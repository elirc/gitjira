// LEARN (sprint 14): one entry point for the design system. Consumers import
// from '@gitjira/ui', never from deep paths — so the package can reorganize
// internally without breaking every caller. The tokens are a side-effect import
// (the CSS) that the app loads once at its root.
export { Button } from './Button.jsx';
export { Modal } from './Modal.jsx';
