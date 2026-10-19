import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// es2017 keeps it running on older iPhones
export default defineConfig({
  plugins: [react()],
  build: { target: "es2017", cssTarget: "safari12" },
});
