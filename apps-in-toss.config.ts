import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'color-hunt-run',
  brand: {
    primaryColor: '#FAF8F3', // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
  },
  permissions: [{ name: 'photos', access: 'read' }],
  webBundleDir: 'dist',
});
