import { useCallback, useEffect, useState } from "react";
import {
  isSupabaseConfigured,
  supabase,
  type OrganizationSettings,
  type OrganizationMember,
} from "@/lib/supabase";

import {
  loadLocalSettings,
  saveLocalSettings,
} from "@/lib/localSettings";

export function useOrganization(userId: string | undefined) {
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) {
      setSettings(loadLocalSettings());
      setOrgId("local");
      setMembers([]);
      setLoading(false);
      return;
    }

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      setLoading(false);
      return;
    }

    setOrgId(membership.organization_id);

    const [{ data: settingsData }, { data: membersData }] = await Promise.all([
      supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", membership.organization_id)
        .single(),
      supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", membership.organization_id),
    ]);

    setSettings(settingsData as OrganizationSettings);
    setMembers((membersData as OrganizationMember[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateSettings = async (patch: Partial<OrganizationSettings>) => {
    if (!settings) return;

    if (!isSupabaseConfigured || orgId === "local") {
      const next = { ...settings, ...patch };
      saveLocalSettings(next);
      setSettings(next);
      return;
    }

    const { data, error } = await supabase
      .from("organization_settings")
      .update(patch)
      .eq("organization_id", orgId!)
      .select()
      .single();

    if (error) throw error;
    setSettings(data as OrganizationSettings);
  };

  const inviteMember = async (email: string) => {
    if (!isSupabaseConfigured || !orgId) {
      throw new Error("Team invites require Supabase configuration");
    }

    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { invited_org_id: orgId },
      },
    });

    if (error) throw error;
    return data;
  };

  return {
    settings,
    members,
    orgId,
    loading,
    updateSettings,
    inviteMember,
    refresh,
  };
}
