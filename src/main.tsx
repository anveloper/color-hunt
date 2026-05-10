import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles/index.css";
import Onboarding from "./routes/Onboarding";
import Grid from "./routes/Grid";

const router = createBrowserRouter([
  { path: "/", element: <Onboarding /> },
  { path: "/grid", element: <Grid /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
