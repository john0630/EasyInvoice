import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { isSupabaseConfigured } from "@/lib/supabase";

export function TeamPage() {
  const { user } = useAuth();
  const { members, inviteMember, loading } = useOrganization(user?.id);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      await inviteMember(email.trim());
      toast.success(`Invite sent to ${email}`);
      setEmail("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Team</h1>
        <p className="text-slate-500">
          Team features require Supabase. Configure{" "}
          <code className="bg-slate-100 px-1 rounded">VITE_SUPABASE_URL</code> and{" "}
          <code className="bg-slate-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>{" "}
          in a <code className="bg-slate-100 px-1 rounded">.env</code> file.
        </p>
        <p className="text-sm text-slate-400 mt-4">
          The app runs in local mode without cloud auth — all documents save to your browser.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Team</h1>
        <p className="text-slate-500">Sign in to manage your team.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Team</h1>
      <p className="text-slate-500 text-sm mb-8">
        Invite colleagues to access shared documents in your organization.
      </p>

      <form onSubmit={handleInvite} className="flex gap-2 mb-8">
        <input
          type="email"
          required
          placeholder="colleague@company.com"
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          type="submit"
          disabled={inviting}
          className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
        >
          {inviting ? "Sending…" : "Invite"}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {loading ? (
          <div className="p-4 animate-pulse h-12 bg-slate-50" />
        ) : members.length === 0 ? (
          <p className="p-4 text-slate-500 text-sm">No team members yet.</p>
        ) : (
          members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4">
              <span className="text-sm text-slate-600 font-mono truncate">
                {m.user_id.slice(0, 8)}…
              </span>
              <span className="text-xs font-medium uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded">
                {m.role}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
