import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { SessionTimeoutDialog } from "./SessionTimeoutDialog";

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
}

export function SessionTimeoutProvider({ children }: SessionTimeoutProviderProps) {
  const { showWarning, remainingTime, renewSession, handleLogout } = useSessionTimeout();

  return (
    <>
      {children}
      <SessionTimeoutDialog
        open={showWarning}
        remainingTime={remainingTime}
        onRenew={renewSession}
        onLogout={handleLogout}
      />
    </>
  );
}
