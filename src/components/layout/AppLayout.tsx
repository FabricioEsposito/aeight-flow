import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { useIsTabletOrMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isTabletOrMobile = useIsTabletOrMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex w-full bg-gradient-subtle">
      {/* Desktop Sidebar */}
      {!isTabletOrMobile && <AppSidebar />}

      {/* Mobile/Tablet Sidebar */}
      {isTabletOrMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <AppSidebar onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      <div className={`flex-1 flex flex-col min-w-0 ${!isTabletOrMobile ? 'ml-64' : ''}`}>
        <AppHeader onMenuToggle={isTabletOrMobile ? () => setSidebarOpen(true) : undefined} />
        <main className="flex-1 p-4 lg:p-6 xl:p-8 overflow-x-auto">
          <div className="w-full max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
