import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";

function injectCrossOriginHeaders(): Plugin {
  return {
    name: 'inject-cross-origin-headers',
    transformIndexHtml(html) {
      return html.replace(
        '<head>',
        `<head>
    <meta http-equiv="Cross-Origin-Embedder-Policy" content="require-corp">
    <meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin">`
      );
    },
  };
}

export default defineConfig({
  base: '/luminaEdit/',
  plugins: [react(), injectCrossOriginHeaders()],
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  build:{
    minify:'esbuild',
    rollupOptions:{
      treeshake:true,
    },
    chunkSizeWarningLimit:1000
  }
});
