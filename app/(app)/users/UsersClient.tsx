"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  NBBadge,
  NBButton,
  NBCard,
  NBInput,
  NBLabel,
  NBSelect,
} from "@/components/ui";
import { createUser, deleteUser, resetPassword } from "@/lib/actions/users";
import { useToast } from "@/components/Toast";

type Row = {
  id: number;
  username: string;
  displayName: string | null;
  role: string;
  createdAt: string;
};

function Flash({ msg }: { msg: { ok: boolean; message: string } | null }) {
  if (!msg) return null;
  return (
    <p
      className={`rounded-md border-2 border-ink px-3 py-2 text-sm font-bold ${
        msg.ok ? "bg-lime" : "bg-red text-white"
      }`}
    >
      {msg.message}
    </p>
  );
}

export function UsersClient({
  users,
  currentUserId,
}: {
  users: Row[];
  currentUserId: number;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AddUserForm />
      <div className="space-y-3">
        <h2 className="text-xl font-bold">Members ({users.length})</h2>
        {users.map((u) => (
          <UserRow key={u.id} row={u} isSelf={u.id === currentUserId} />
        ))}
      </div>
    </div>
  );
}

function AddUserForm() {
  const router = useRouter();
  const toast = useToast();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(formData: FormData) {
    start(async () => {
      const res = await createUser(null, formData);
      setMsg(res);
      toast.result(res);
      if (res.ok) {
        (document.getElementById("add-user-form") as HTMLFormElement)?.reset();
        router.refresh();
      }
    });
  }

  return (
    <NBCard className="bg-yellow">
      <h2 className="mb-4 text-xl font-bold">➕ Add a team member</h2>
      <form id="add-user-form" action={onSubmit} className="space-y-3">
        <div>
          <NBLabel>Role</NBLabel>
          <NBSelect name="role" defaultValue="agent">
            <option value="agent">Agent (limited access)</option>
            <option value="admin">Admin (full access)</option>
          </NBSelect>
        </div>
        <div>
          <NBLabel>Username</NBLabel>
          <NBInput name="username" placeholder="e.g. sara" autoComplete="off" />
        </div>
        <div>
          <NBLabel>Display name (optional)</NBLabel>
          <NBInput name="displayName" placeholder="Sara K." />
        </div>
        <div>
          <NBLabel>Password</NBLabel>
          <NBInput
            name="password"
            type="password"
            placeholder="at least 6 characters"
            autoComplete="new-password"
          />
        </div>
        <Flash msg={msg} />
        <NBButton type="submit" color="lime" disabled={pending}>
          {pending ? "Adding…" : "Add member"}
        </NBButton>
      </form>
    </NBCard>
  );
}

function UserRow({ row, isSelf }: { row: Row; isSelf: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [pw, setPw] = useState("");

  async function onDelete() {
    if (!confirm(`Delete “${row.username}”?`)) return;
    setBusy(true);
    const res = await deleteUser(row.id);
    setMsg(res);
    toast.result(res);
    setBusy(false);
    if (res.ok) router.refresh();
  }

  async function onReset() {
    setBusy(true);
    const res = await resetPassword(row.id, pw);
    setMsg(res);
    toast.result(res);
    setBusy(false);
    if (res.ok) {
      setResetOpen(false);
      setPw("");
    }
  }

  return (
    <NBCard>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold">
            {row.username}
            {isSelf && <span className="ml-2 text-xs text-ink/50">(you)</span>}
          </p>
          {row.displayName && (
            <p className="text-xs text-ink/60">{row.displayName}</p>
          )}
        </div>
        <NBBadge color={row.role === "admin" ? "pink" : "blue"}>
          {row.role}
        </NBBadge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <NBButton onClick={() => setResetOpen((v) => !v)}>🔑 Reset password</NBButton>
        {!isSelf && (
          <NBButton color="red" onClick={onDelete} disabled={busy}>
            🗑 Delete
          </NBButton>
        )}
      </div>

      {resetOpen && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border-2 border-dashed border-ink p-3">
          <div className="flex-1">
            <NBLabel>New password</NBLabel>
            <NBInput
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="at least 6 characters"
            />
          </div>
          <NBButton color="lime" onClick={onReset} disabled={busy || pw.length < 6}>
            Save
          </NBButton>
        </div>
      )}

      <div className="mt-2">
        <Flash msg={msg} />
      </div>
    </NBCard>
  );
}
