// ============================================================
// PHH Inventory — App Layout (Sidebar + Content)
// h-screen locked layout — no page-level scroll
// ============================================================

import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useSession, signOut } from "../../lib/auth-client";
import {
  Factory,
  LayoutDashboard,
  LogOut,
  User,
  ChevronRight,
  Archive,
  Folder,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function AppLayout() {
  const { data: session } = useSession();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/groups", label: "Groups", icon: Folder },
    { to: "/archived", label: "Archived", icon: Archive },
  ];

  return (
    <div className="h-screen flex bg-bg-base theme-transition overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-56 bg-bg-surface border-r border-border flex flex-col shrink-0 theme-transition relative z-40">
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Factory className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-text-primary text-sm leading-tight">
              PHH Inventory
            </h1>
            <p className="text-[10px] text-text-muted leading-tight">
              Cutting Manager
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 ${isActive
                  ? "bg-primary/10 text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* Bottom: Theme Toggle + User */}
        <div className="border-t border-border">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
              Theme
            </span>
            <ThemeToggle />
          </div>
          <div className="px-2 pb-3">
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-bg-elevated/50">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate leading-tight">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-[10px] text-text-muted truncate leading-tight">
                  {session?.user?.role || "operator"}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1 rounded-lg hover:bg-bg-hover text-text-muted hover:text-danger transition-colors cursor-pointer focus:outline-none"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 min-w-0 overflow-y-auto relative z-0 bg-bg-base">
        <Outlet />
      </main>
    </div>
  );
}
