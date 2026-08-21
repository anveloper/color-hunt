import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import "./styles/index.css";
import AppShell from "./components/app-shell";
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
    <TDSMobileAITProvider>
      <RouterProvider router={router} />
    </TDSMobileAITProvider>
  </StrictMode>,
);
