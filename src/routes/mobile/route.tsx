import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/mobile")({
  component: MobileRootComponent,
});

function MobileRootComponent() {
  return <Outlet />;
}
