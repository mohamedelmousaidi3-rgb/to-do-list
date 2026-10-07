import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Keep built asset paths relative so the production bundle can be deployed
  // under any site path.
  base: "./",
  plugins: [react()],
});
