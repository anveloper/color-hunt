import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  root: "/private/tmp/claude-501/-Users-anmini-Workspace-color-hunt/0bd86c85-7b43-460e-b259-6e1c80b538f8/scratchpad/proto",
  plugins: [react(), tailwindcss()],
  build: { outDir: "/private/tmp/claude-501/-Users-anmini-Workspace-color-hunt/0bd86c85-7b43-460e-b259-6e1c80b538f8/scratchpad/dist-proto", emptyOutDir: true },
});
