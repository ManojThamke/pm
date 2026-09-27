import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const e2eDatabasePath = path.resolve(__dirname, "..", ".playwright-data", "e2e.sqlite3");

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://127.0.0.1:8000",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "powershell -NoProfile -Command \"Remove-Item ..\\.playwright-data\\e2e.sqlite3* -Force -ErrorAction SilentlyContinue\"; npm run build; ..\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --app-dir ../backend --host 127.0.0.1 --port 8000",
    url: "http://127.0.0.1:8000",
    reuseExistingServer: false,
    env: {
      PM_DATABASE_PATH: e2eDatabasePath,
    },
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
