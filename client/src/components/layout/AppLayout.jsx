// ============================================================
// PHH Inventory — App Layout (Sidebar + Content)
// Refactored: consistent spacing, theme toggle, improved hierarchy
// ============================================================

import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useSession, signOut } from "../../lib/auth-client";
import {
  Factory,
  LayoutDashboard,
  LogOut,
  User,
  ChevronRight,
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
  ];

  return (
    <div className="min-h-screen flex bg-bg-base theme-transition">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-bg-surface border-r border-border flex flex-col shrink-0 theme-transition relative z-40">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Factory className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-text-primary text-sm leading-tight">
              PHH Inventory
            </h1>
            <p className="text-xs text-text-muted leading-tight">
              Cutting Manager
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  isActive
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
          {/* Theme toggle row */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-xs text-text-muted font-medium uppercase tracking-wider">
              Theme
            </span>
            <ThemeToggle />
          </div>

          {/* User info */}
          <div className="px-3 pb-4">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg-elevated/50">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate leading-tight">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-xs text-text-muted truncate leading-tight">
                  {session?.user?.role || "operator"}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-danger transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-danger/50"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-auto relative z-0">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
