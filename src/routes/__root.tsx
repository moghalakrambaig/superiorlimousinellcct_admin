import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl gradient-gold-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md gradient-gold px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 inline-flex items-center justify-center rounded-md gradient-gold px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Superior Limousine LLC — Executive Transportation CRM" },
      { name: "description", content: "Superior Limousine LLC Executive Transportation — admin CRM for managing clients, reservations, chauffeurs, and billing." },
      { property: "og:title", content: "Superior Limousine LLC — Executive Transportation CRM" },
      { name: "twitter:title", content: "Superior Limousine LLC — Executive Transportation CRM" },
      { property: "og:description", content: "Superior Limousine LLC Executive Transportation — admin CRM for managing clients, reservations, chauffeurs, and billing." },
      { name: "twitter:description", content: "Superior Limousine LLC Executive Transportation — admin CRM for managing clients, reservations, chauffeurs, and billing." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/30ed0db1-d60a-4f07-b521-e25121078ecf/id-preview-349cb232--7b650318-0b15-45fd-8cf7-83951b7b40af.lovable.app-1778593842846.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/30ed0db1-d60a-4f07-b521-e25121078ecf/id-preview-349cb232--7b650318-0b15-45fd-8cf7-83951b7b40af.lovable.app-1778593842846.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const isMobile = useIsMobile();

  React.useEffect(() => {
    // Basic redirect logic to push users to /mobile branch if on small screen
    // Note: In production you might want this to be SSR-aware or more robust
    const path = window.location.pathname;
    
    // Only redirect if not already on a mobile path and device is mobile
    if (isMobile && !path.startsWith("/mobile")) {
      const target = path === "/" ? "/mobile" : `/mobile${path}`;
      // avoid redirect loops
      if (target !== path) {
        router.navigate({ to: target as any, replace: true });
      }
    } 
    // Redirect back to desktop if on a mobile path and device is desktop
    else if (!isMobile && path.startsWith("/mobile")) {
      let target = path.replace("/mobile", "");
      if (target === "") target = "/";
      if (target !== path) {
        router.navigate({ to: target as any, replace: true });
      }
    }
  }, [isMobile, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster theme="dark" position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
