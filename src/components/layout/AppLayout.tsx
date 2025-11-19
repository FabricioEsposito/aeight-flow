import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex w-full bg-gradient-subtle">
      <AppSidebar />
      <div className="flex-1 flex flex-col ml-64">
        <AppHeader />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}