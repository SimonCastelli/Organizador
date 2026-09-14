import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// GITHUB_PAGES=1 se usa en el workflow de Actions para publicar en
// https://<usuario>.github.io/Organizador/ — en local o en un server propio
// la base queda en "/".
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? "/Organizador/" : "/",
  test: {
    environment: "jsdom",
    globals: true,
    // e2e/ es Playwright, no Vitest.
    exclude: ["node_modules/**", "e2e/**"],
  },
});
