"use client";
import { useState, useEffect, createContext, useContext } from "react";

interface MeData {
  id: string;
  name: string;
  role: string;
  permissions: string[];
  isOwner: boolean;
}

const MeContext = createContext<MeData | null>(null);

export function useMe() {
  return useContext(MeContext);
}

export function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.role) setMe(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  return <MeContext.Provider value={me}>{children}</MeContext.Provider>;
}

export function hasPerm(me: MeData | null, perm: string): boolean {
  if (!me) return false;
  if (me.isOwner) return true;
  return me.permissions.includes(perm);
}

export function PermGuard({
  perm,
  children,
}: {
  perm: string;
  children: React.ReactNode;
}) {
  const me = useMe();
  if (!me || !hasPerm(me, perm)) {
    return (
      <div style={{ padding: "3rem 2rem", textAlign: "center" }}>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.2rem" }}>Access Denied</h2>
        <p style={{ color: "var(--text-3)", fontSize: "0.9rem" }}>
          You don&apos;t have permission to view this page. Contact your administrator.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
