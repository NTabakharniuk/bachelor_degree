import { defineConfig } from 'vite';

export default defineConfig({
  // Ensure no custom configuration is blocking the /public directory
  server: {
    open: true, // Automatically open the browser on server start
  },
});
