import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { useIsTabletOrMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isTabletOrMobile = useIsTabletOrMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex w-full bg-gradient-subtle">
      {/* Desktop Sidebar */}
      {!isTabletOrMobile && (
        <div
          className={cn(
            "fixed left-0 top-0 h-screen z-30 transition-transform duration-300 ease-in-out",
            sidebarCollapsed ? "-translate-x-64" : "translate-x-0"
          )}
        >
          <AppSidebar />
        </div>
      )}

      {/* Mobile/Tablet Sidebar */}
      {isTabletOrMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <AppSidebar onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ease-in-out",
          !isTabletOrMobile && !sidebarCollapsed ? "ml-64" : "ml-0"
        )}
      >
        <AppHeader
          onMenuToggle={
            isTabletOrMobile
              ? () => setSidebarOpen(true)
              : () => setSidebarCollapsed((prev) => !prev)
          }
          sidebarCollapsed={!isTabletOrMobile && sidebarCollapsed}
        />
        <main className="flex-1 p-4 lg:p-5 xl:p-6 overflow-x-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
