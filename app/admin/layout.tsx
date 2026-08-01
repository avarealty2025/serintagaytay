import { Mark } from "../mark.tsx";
import { SideNav } from "./_nav.tsx";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
      <main className="main">{children}</main>
    </div>
  );
}
