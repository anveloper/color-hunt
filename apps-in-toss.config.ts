import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'color-hunt-run',
  brand: {
    primaryColor: '#FAF8F3', // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
  },
  permissions: [
    { name: 'photos', access: 'read' },
    { name: 'camera', access: 'access' },
    // 달린 경로/사진 지점 기록용. 거부해도 그리드 기능은 그대로 동작한다.
    { name: 'geolocation', access: 'access' },
  ],
  webBundleDir: 'dist',
});
