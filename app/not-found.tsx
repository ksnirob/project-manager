import Link from "next/link";
import { ArrowLeft, Home, SearchX } from "lucide-react";
import { FloatingCard } from "@/components/ui/FloatingCard";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
      <FloatingCard className="w-full max-w-2xl text-center py-14">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-indigo-300">
          <SearchX className="h-8 w-8" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/35">404</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Page Not Found</h1>
        <p className="mx-auto mt-3 max-w-md text-white/50">
          This page does not exist or may have been moved. Return to a working area from below.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 font-medium text-white shadow-lg shadow-indigo-500/25 transition-colors hover:bg-indigo-600"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Projects
          </Link>
        </div>
      </FloatingCard>
    </div>
  );
}
