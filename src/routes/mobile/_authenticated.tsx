import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/mobile/_authenticated")({
  beforeLoad: () => {
    // If not authenticated, the app's Root or existing logic might handle it,
    // but we can ensure here that this layout requires auth if needed.
    // If you have global auth redirect in __root, you don't strictly need it here.
  },
  component: MobileAuthLayout,
});

function MobileAuthLayout() {
  useAuth();
  
  // We extract a page title if possible from child routes or set a default
  // For this simple version, we'll let each page render its own specific things 
  // or use the MobileLayout wrapper.
  return (
    <MobileLayout>
      <Outlet />
    </MobileLayout>
  );
}
