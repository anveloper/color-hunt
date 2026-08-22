import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles/index.css";
import AppShell from "./components/app-shell";
import ErrorBoundary from "./components/error-boundary";
import TdsMount from "./components/tds-mount";
import Onboarding from "./routes/onboarding";
import Hunt from "./routes/hunt";

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <Onboarding /> },
      { path: "/hunt", element: <Hunt /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
    {/* TDS는 미니앱에서만, 앱 트리 바깥에서 로드된다.
        다이얼로그가 portal로 body에 렌더되므로 감쌀 필요가 없고,
        형제로 두면 청크를 기다리는 동안에도 앱이 즉시 그려진다. */}
    <TdsMount />
  </StrictMode>,
);
