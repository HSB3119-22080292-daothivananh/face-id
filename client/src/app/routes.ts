import { createHashRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { LiveRecognition } from "./components/LiveRecognition";
import { RegisteredFaces } from "./components/RegisteredFaces";
import { ActivityLog } from "./components/ActivityLog";
import { EmployeePortal } from "./components/EmployeePortal";
import { AdminRoute, EmployeeRoute, LoginScreen, ResetPasswordScreen } from "./components/Auth";

export const router = createHashRouter([
  { path: "/login", Component: LoginScreen },
  { path: "/reset-password", Component: ResetPasswordScreen },
  {
    path: "/",
    Component: AdminRoute,
    children: [
      {
        Component: Layout,
        children: [
          { index: true, Component: Dashboard },
          { path: "live", Component: LiveRecognition },
          { path: "faces", Component: RegisteredFaces },
          { path: "activity", Component: ActivityLog },
        ],
      },
    ],
  },
  {
    path: "/employee",
    Component: EmployeeRoute,
    children: [
      { index: true, Component: EmployeePortal },
    ],
  },
]);
