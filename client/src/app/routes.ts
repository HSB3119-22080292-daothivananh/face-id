import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { LiveRecognition } from "./components/LiveRecognition";
import { RegisteredFaces } from "./components/RegisteredFaces";
import { ActivityLog } from "./components/ActivityLog";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "live", Component: LiveRecognition },
      { path: "faces", Component: RegisteredFaces },
      { path: "activity", Component: ActivityLog },
    ],
  },
]);
