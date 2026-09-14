import { defineConfig, devices } from "@playwright/test";

// El binario pinneado por @playwright/test puede no coincidir con el
// Chromium pre-instalado del entorno; se apunta directo al ejecutable en vez
// de dejar que Playwright intente descargar otro.
const EJECUTABLE_CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
  },
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], launchOptions: { executablePath: EJECUTABLE_CHROMIUM } },
    },
  ],
});
