import * as React from "react";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";
import bgVideo from "@/assets/bg.mp4?url";

export function MobileLayout({ 
  children, 
  title 
}: { 
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="relative min-h-screen flex flex-col w-full overflow-hidden bg-background">
      <video
        className="fixed inset-0 w-full h-full object-cover -z-10 opacity-15 pointer-events-none"
        src={bgVideo}
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background/90 via-background/80 to-background/95 pointer-events-none" />
      
      <MobileHeader title={title} />
      
      {/* 
        Main content area needs padding for header (pt-14) and bottom nav (pb-16).
        Additional pb-safe is needed for iOS safe areas.
      */}
      <main className="flex-1 overflow-y-auto w-full pb-20 pt-4 px-4 scroll-smooth">
        {children}
      </main>
      
      <BottomNav />
    </div>
  );
}
