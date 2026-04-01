"use client";

import { useActionState } from "react";
import { adminLogin, type LoginFormState } from "@/app/actions/auth";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { FloatingCard } from "@/components/ui/FloatingCard";
import { ShieldCheck } from "lucide-react";

const initialState: LoginFormState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(adminLogin, initialState);

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4">
      <FloatingCard className="w-full max-w-md !p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-400/20">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Login</h1>
          <p className="mt-2 text-sm text-white/50">Sign in to access the dashboard.</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-white/80">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" placeholder="admin@company.com" className="w-full" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-white/80">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="Enter password" className="w-full" />
          </div>

          {state?.error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {state.error}
            </p>
          )}

          <AnimatedButton type="submit" className="w-full justify-center" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign In"}
          </AnimatedButton>
        </form>
      </FloatingCard>
    </div>
  );
}
