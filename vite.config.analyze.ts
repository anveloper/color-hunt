import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import aitDevtools from "@apps-in-toss/devtools/unplugin";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    aitDevtools.vite(),
    react(),
    tailwindcss(),
    visualizer({
      filename: "/private/tmp/claude-501/-Users-anmini-Workspace-color-hunt/0bd86c85-7b43-460e-b259-6e1c80b538f8/scratchpad/stats.html",
      template: "raw-data",
      gzipSize: true,
      brotliSize: false,
    }) as never,
  ],
  build: { outDir: "/private/tmp/claude-501/-Users-anmini-Workspace-color-hunt/0bd86c85-7b43-460e-b259-6e1c80b538f8/scratchpad/dist-analyze", emptyOutDir: true, sourcemap: true },
});
