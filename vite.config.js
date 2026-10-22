import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// es2017 keeps it running on older iPhones
export default defineConfig({
  plugins: [react()],
  // which deploy an error report came from
  define: { __BUILD__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7)) },
  build: { target: "es2017", cssTarget: "safari12" },
});
