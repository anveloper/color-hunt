/**
 * 앱인토스 웹뷰 안에서 실행 중인지 판정한다.
 * SDK 내부(assertWebViewEnvironment)와 같은 기준을 쓴다.
 *
 * 이 파일은 의도적으로 아무것도 import하지 않는다. isInToss() 하나 때문에
 * 앱인토스 SDK나 TDS가 초기 번들로 끌려오면 안 되기 때문이다.
 */
export function isInToss(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as { ReactNativeWebView?: unknown }).ReactNativeWebView != null
  );
}
