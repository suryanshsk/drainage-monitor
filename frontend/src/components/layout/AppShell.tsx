import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell({
  title,
  subtitle,
  children,
  headerActions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerActions?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--color-bg-0)]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} subtitle={subtitle} headerActions={headerActions} />
        <main className="fade-in flex-1 overflow-y-auto overflow-x-hidden p-5">{children}</main>
      </div>
    </div>
  );
}
