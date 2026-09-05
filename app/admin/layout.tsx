import { Mark } from "../mark.tsx";
import { SideNav } from "./_nav.tsx";
import { NotificationBell } from "./_my-tasks.tsx";
import { AiAssistant } from "./_ai-assistant.tsx";
import { MeProvider } from "./_perm-guard.tsx";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MeProvider>
      <div className="shell">
        <aside className="side">
          <div className="lockup">
            <Mark />
            <p className="brand">
              Serin
              <small>Tagaytay</small>
            </p>
          </div>
          <SideNav />
        </aside>
        <main className="main">
          <div style={{ position: "fixed", top: "0.5rem", right: "1rem", zIndex: 100 }}>
            <NotificationBell />
          </div>
          {children}
        </main>
        <AiAssistant />
      </div>
    </MeProvider>
  );
}
