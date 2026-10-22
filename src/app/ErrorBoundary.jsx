import React from "react";
import { reportError } from "./errors.js";

// If a screen crashes, show a way back instead of a blank page, and send a report.
// Styles are inline because the app's stylesheet goes away with the crashed screen.
export class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error, info) { reportError(error, { kind: "crash", componentStack: info && info.componentStack }); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#111214", color: "#F2F2EE", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", fontFamily: "'Familjen Grotesk Variable', -apple-system, system-ui, sans-serif" }}>
        <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 52, lineHeight: 0.9, textTransform: "uppercase" }}>Something broke</div>
        <p style={{ maxWidth: 320, margin: "14px 0 26px", fontSize: 15, lineHeight: 1.5, color: "#A3A6AD" }}>felt hit a bug and sent a report so it can get fixed. Your chips and progress are saved.</p>
        <button onClick={() => window.location.reload()} style={{ minWidth: 220, minHeight: 56, border: "none", borderRadius: 12, background: "#EDB000", color: "#111214", fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 24, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer" }}>Reload</button>
      </div>
    );
  }
}
