import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Terminal, History, Wrench, Menu, X, User, LogIn, FolderOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { AuthModal } from "./auth-modal";

const navItems = [
  { href: "/", label: "Editor", icon: Terminal },
  { href: "/history", label: "History", icon: History },
  { href: "/toolchains", label: "Toolchains", icon: Wrench },
  { href: "/profile", label: "My Projects", icon: FolderOpen },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* ── Desktop Sidebar (dark) ── */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50 bg-sidebar border-r border-sidebar-border shadow-xl">
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center mr-3">
            <Terminal className="w-4 h-4 text-sidebar-primary" />
          </div>
          <span className="font-bold text-xl tracking-tight text-sidebar-foreground">
            Polyglot
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group relative cursor-pointer",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className={cn("w-4.5 h-4.5 mr-3", isActive ? "text-white" : "")} style={{ width: 18, height: 18 }} />
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-xl bg-sidebar-primary -z-10"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-3 border-t border-sidebar-border space-y-2">
          {loading ? (
            <div className="rounded-xl bg-sidebar-accent p-3 animate-pulse">
              <div className="h-9 bg-sidebar-foreground/10 rounded-lg" />
            </div>
          ) : user ? (
            <Link href="/profile" className="block">
              <div className="rounded-xl bg-sidebar-accent p-3 flex items-center gap-3 hover:bg-sidebar-accent/80 hover:border-sidebar-primary/30 border border-transparent transition-all cursor-pointer group">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-9 h-9 rounded-lg object-cover border border-sidebar-border"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-sidebar-primary">
                      {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate group-hover:text-sidebar-primary transition-colors">
                    {user.displayName || "User"}
                  </p>
                  <p className="text-xs text-sidebar-foreground/50 truncate">{user.email}</p>
                </div>
              </div>
            </Link>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full rounded-xl bg-sidebar-primary/15 p-3 border border-sidebar-primary/20 flex items-center gap-3 hover:bg-sidebar-primary/25 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-sidebar-primary/20 border border-sidebar-primary/30 flex items-center justify-center shrink-0">
                <LogIn className="w-4 h-4 text-sidebar-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-sidebar-foreground group-hover:text-sidebar-primary transition-colors">
                  Sign In
                </p>
                <p className="text-xs text-sidebar-foreground/50">Save your projects</p>
              </div>
            </button>
          )}

          {/* Status */}
          <div className="rounded-xl bg-sidebar-accent px-3 py-2.5 border border-sidebar-border">
            <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest font-bold mb-1.5">System Status</p>
            <div className="flex items-center text-xs text-emerald-400 font-medium">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              All Systems Operational
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar border-b border-sidebar-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-sidebar-primary" />
          <span className="font-bold text-base text-sidebar-foreground">Polyglot</span>
        </div>
        <div className="flex items-center gap-2">
          {!loading && !user && (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="p-2 rounded-lg bg-sidebar-primary/15 border border-sidebar-primary/20 text-sidebar-primary"
            >
              <LogIn className="w-4 h-4" />
            </button>
          )}
          {!loading && user && (
            <Link href="/profile">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-sidebar-primary" />
                </div>
              )}
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-sidebar-accent text-sidebar-foreground"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="md:hidden fixed top-14 left-0 right-0 bg-sidebar border-b border-sidebar-border z-40 p-3 shadow-xl"
          >
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="block">
                  <div
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-sm font-medium",
                      location === item.href
                        ? "bg-sidebar-primary text-white"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </div>
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content (light) ── */}
      <main className="flex-1 md:ml-64 mt-14 md:mt-0 relative overflow-x-hidden bg-background">
        {/* Subtle top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-emerald-400/40 to-transparent pointer-events-none" />
        <div className="p-5 md:p-8 w-full max-w-7xl mx-auto min-h-[calc(100vh-3.5rem)] md:min-h-screen flex flex-col relative z-10">
          {children}
        </div>
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
