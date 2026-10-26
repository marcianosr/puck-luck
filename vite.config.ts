import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths, so the build works under GitHub Pages' /puck-luck/ subpath without hardcoding it.
  base: './',
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  test: { environment: 'node' },
});
