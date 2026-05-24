import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar, MobileTopBar } from "@/components/web/AppSidebar";
import bgVideo from "@/assets/bg.mp4?url";

export const Route = createFileRoute("/_web/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="relative min-h-screen flex w-full">
      <video
        className="fixed inset-0 w-full h-full object-cover -z-10 opacity-25 pointer-events-none"
        src={bgVideo}
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background/80 via-background/70 to-background/90 pointer-events-none" />
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
