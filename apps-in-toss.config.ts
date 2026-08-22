import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'color-hunt-run',
  brand: {
    // 앱 배경 종이색(styles/index.css의 --color-paper)과 맞춘다.
    primaryColor: '#F6F1E3',
  },
  permissions: [
    { name: 'photos', access: 'read' },
    { name: 'camera', access: 'access' },
    // 달린 경로/사진 지점 기록용. 거부해도 그리드 기능은 그대로 동작한다.
    { name: 'geolocation', access: 'access' },
  ],
  webView: {
    // 전체 화면 그리드라 스크롤이 없다. 바운스/오버스크롤을 허용하면
    // 프레임 바깥이 드러나고 제스처 편집과도 충돌한다.
    bounces: false,
    overScrollMode: 'never',
    pullToRefreshEnabled: false,
  },
  webBundleDir: 'dist',
});
