"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, FolderKanban, CheckSquare, FileText, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminLogout } from "@/app/actions/auth";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Invoices", href: "/invoices", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const [admin, setAdmin] = useState<{ name: string | null; email: string } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadAdmin = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          setAdmin(null);
          return;
        }

        const data = await res.json();
        setAdmin(data.admin ?? null);
      } catch {
        setAdmin(null);
      }
    };

    loadAdmin();
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <div className="md:hidden fixed left-4 right-4 top-4 z-50 flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl px-4 py-3">
        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text tracking-tight">
          Project Manager
        </h1>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <motion.nav
        initial={false}
        animate={{ x: isMobileMenuOpen ? 0 : -320 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed left-4 top-20 bottom-4 w-[85vw] max-w-72 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] z-50 md:hidden"
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="mb-8 pl-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text flex flex-col tracking-tight">
            <span>Project</span>
            <span className="text-sm text-white/50 tracking-normal font-normal">Manager</span>
          </h2>
        </div>

        <div className="flex-1 space-y-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));

            return (
              <Link key={item.name} href={item.href} className="block relative">
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors relative z-10",
                    isActive
                      ? "text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </motion.div>

                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white/10 border border-white/20 rounded-2xl z-0 pointer-events-none"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto border-t border-white/10 pt-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 border-2 border-white/20 flex items-center justify-center shadow-neon font-bold">
              {(admin?.name?.charAt(0) || admin?.email?.charAt(0) || "A").toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{admin?.name || "System Admin"}</p>
              <p className="text-xs text-white/50">{admin?.email || "admin"}</p>
            </div>
          </div>
          <form action={adminLogout} className="mt-4 px-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </form>
        </div>
      </motion.nav>

      <nav className="fixed left-6 top-6 bottom-6 w-64 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] z-40 hidden md:flex">
        <div className="mb-10 pl-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text flex flex-col tracking-tight">
            <span>Project</span>
            <span className="text-sm text-white/50 tracking-normal font-normal">Manager</span>
          </h1>
        </div>

        <div className="flex-1 space-y-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));

            return (
              <Link key={item.name} href={item.href} className="block relative">
                <motion.div
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors relative z-10",
                    isActive
                      ? "text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </motion.div>

                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white/10 border border-white/20 rounded-2xl z-0 pointer-events-none"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto border-t border-white/10 pt-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 border-2 border-white/20 flex items-center justify-center shadow-neon font-bold">
              {(admin?.name?.charAt(0) || admin?.email?.charAt(0) || "A").toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{admin?.name || "System Admin"}</p>
              <p className="text-xs text-white/50">{admin?.email || "admin"}</p>
            </div>
          </div>
          <form action={adminLogout} className="mt-4 px-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </form>
        </div>
      </nav>
    </>
  );
}
