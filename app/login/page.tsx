"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import { NBButton, NBCard, NBInput, NBLabel } from "@/components/ui";

const initial: LoginState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <NBCard className="w-full max-w-sm bg-pink">
        <div className="mb-6 text-center">
          <div className="mb-2 inline-block rotate-[-2deg] rounded-lg border-[3px] border-ink bg-yellow px-3 py-1 text-2xl font-bold shadow-[3px_3px_0_0_#131313]">
            📺 MorsarDash
          </div>
          <p className="mt-3 text-sm font-bold">IPTV Admin Control Panel</p>
        </div>

        <form action={action} className="space-y-4">
          <div>
            <NBLabel>Username</NBLabel>
            <NBInput name="username" defaultValue="admin" autoComplete="username" />
          </div>
          <div>
            <NBLabel>Password</NBLabel>
            <NBInput
              name="password"
              type="password"
              autoComplete="current-password"
            />
          </div>

          {state.error && (
            <p className="rounded-md border-2 border-ink bg-red px-3 py-2 text-sm font-bold text-white">
              {state.error}
            </p>
          )}

          <NBButton type="submit" color="lime" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in →"}
          </NBButton>
        </form>
      </NBCard>
    </main>
  );
}
