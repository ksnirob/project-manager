"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/ui/Sidebar";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <Sidebar />
      <main className="pt-24 md:pt-6 md:ml-[18.5rem] p-6 lg:p-10 min-h-screen">{children}</main>
    </>
  );
}
