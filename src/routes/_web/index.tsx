import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_web/")({
  component: () => <Navigate to="/dashboard" replace />,
});
