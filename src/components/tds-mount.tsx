import { Suspense, lazy } from "react";
import { isInToss } from "../lib/env";

// 미니앱에서만 로드된다. 웹 번들에는 TDS가 들어가지 않는다.
const TdsHost = lazy(() => import("./tds-host"));

export default function TdsMount() {
  if (!isInToss()) return null;
  return (
    <Suspense fallback={null}>
      <TdsHost />
    </Suspense>
  );
}
