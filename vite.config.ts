import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import aitDevtools from "@apps-in-toss/devtools/unplugin";

export default defineConfig(({ mode }) => ({
  plugins: [aitDevtools.vite(), react(), tailwindcss()],
  define: {
    // 앱인토스에서는 파일 피커를 쓰지 않고 네이티브 앨범이 JPEG를 준다.
    // HEIC 변환기(2.7MB, 번들의 절반)가 도달 불가능한 코드가 되므로
    // 미니앱 빌드에서는 상수로 접어 통째로 제거한다.
    __HEIC_ENABLED__: JSON.stringify(mode !== "ait"),
  },
}));
