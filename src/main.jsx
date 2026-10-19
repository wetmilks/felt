import React from "react";
import { createRoot } from "react-dom/client";
// theme pack fonts, bundled so they work offline
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/hanken-grotesk";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource/limelight/400.css";
import "@fontsource-variable/josefin-sans";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
