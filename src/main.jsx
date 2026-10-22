import React from "react";
import { createRoot } from "react-dom/client";
// the Chip Stack look: a tall condensed display face and a clean grotesk, bundled so they work offline
import "@fontsource/big-shoulders-display/latin-700";
import "@fontsource/big-shoulders-display/latin-800";
import "@fontsource/big-shoulders-display/latin-900";
import "@fontsource-variable/familjen-grotesk";
import App from "./App.jsx";
import { ErrorBoundary } from "./app/ErrorBoundary.jsx";
import { installErrorHandlers } from "./app/errors.js";

installErrorHandlers();
createRoot(document.getElementById("root")).render(<ErrorBoundary><App /></ErrorBoundary>);
