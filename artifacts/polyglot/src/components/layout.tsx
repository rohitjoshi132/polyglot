import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Terminal, History, Wrench, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Editor", icon: Terminal },
  { href: "/history", label: "History", icon: History },
  { href: "/toolchains", label: "Toolchains", icon: Wrench },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col fixed inset-y-0 z-50 glass-panel border-r border-border/50">
        <div className="flex h-16 items-center px-6 border-b border-border/50">
          <Terminal className="w-6 h-6 text-primary mr-3" />
          <span className="font-sans font-bold text-xl tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Polyglot
          </span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={cn(
                    "flex items-center px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden cursor-pointer",
                    isActive 
                      ? "text-primary-foreground bg-primary/10 border border-primary/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.1)]" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent -z-10"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className={cn("w-5 h-5 mr-3", isActive ? "text-primary" : "group-hover:text-foreground")} />
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-6 border-t border-border/50">
          <div className="rounded-xl bg-secondary/50 p-4 border border-white/5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2">System Status</p>
            <div className="flex items-center text-sm text-primary">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              All Systems Operational
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 glass-panel border-b border-border/50 z-50 flex items-center justify-between px-4">
        <div className="flex items-center">
          <Terminal className="w-5 h-5 text-primary mr-2" />
          <span className="font-bold text-lg">Polyglot</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-secondary/50 text-foreground hover:text-primary transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed top-16 left-0 right-0 bg-card border-b border-border/50 z-40 p-4 shadow-2xl"
          >
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="block">
                  <div
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-3 rounded-xl transition-colors cursor-pointer",
                      location === item.href 
                        ? "bg-primary/20 text-primary" 
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 mt-16 md:mt-0 relative overflow-x-hidden">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2"></div>
        <div className="p-4 md:p-8 w-full max-w-7xl mx-auto min-h-[calc(100vh-4rem)] md:min-h-screen flex flex-col relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
