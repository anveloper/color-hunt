import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import aitDevtools from "@apps-in-toss/devtools/unplugin";
export default defineConfig({
  plugins: [aitDevtools.vite(), react(), tailwindcss()],
  resolve: { alias: { '@toss/tds-mobile': '/private/tmp/claude-501/-Users-anmini-Workspace-color-hunt/0bd86c85-7b43-460e-b259-6e1c80b538f8/scratchpad/stubs/tds-mobile.tsx', '@toss/tds-mobile-ait': '/private/tmp/claude-501/-Users-anmini-Workspace-color-hunt/0bd86c85-7b43-460e-b259-6e1c80b538f8/scratchpad/stubs/tds-mobile-ait.tsx', '@apps-in-toss/web-framework': '/private/tmp/claude-501/-Users-anmini-Workspace-color-hunt/0bd86c85-7b43-460e-b259-6e1c80b538f8/scratchpad/stubs/web-framework.tsx' } },
  build: { outDir: "/private/tmp/claude-501/-Users-anmini-Workspace-color-hunt/0bd86c85-7b43-460e-b259-6e1c80b538f8/scratchpad/dist-nothing", emptyOutDir: true },
});
