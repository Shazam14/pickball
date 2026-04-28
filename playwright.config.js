import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  use: {
    baseURL: 'https://pickball.vercel.app',
    screenshot: 'on',
    video: 'on',
    // Pre-launch basic-auth gate (SITE_PASSWORD in .env.local).
    // Tests run against localhost:3000 which sees the same env.
    httpCredentials: process.env.SITE_PASSWORD
      ? { username: process.env.SITE_USER || 'sideout', password: process.env.SITE_PASSWORD }
      : undefined,
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'iPhone SE',
      use: { ...devices['iPhone SE'] },
    },
    {
      name: 'iPhone 14 Pro',
      use: { ...devices['iPhone 14 Pro'] },
    },
    {
      name: 'Pixel 7',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'iPad',
      use: { ...devices['iPad'] },
    },
    {
      name: 'iPad Pro',
      use: { ...devices['iPad Pro 11'] },
    },
  ],
});
