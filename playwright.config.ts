import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  // Các bài đo FPS cần máy rảnh: chạy song song nhiều file sẽ tranh CPU và
  // khiến chúng trượt mốc 60 FPS dù game không hề chậm đi.
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    port: 3000,
    reuseExistingServer: false,
    timeout: 45_000,
  },
});
