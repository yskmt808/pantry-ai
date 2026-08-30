"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveHousehold } from "@/app/actions/items";
import { revalidatePath } from "next/cache";

export interface HouseholdDetail {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
  members: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    role: string;
  }[];
  activeDeviceCount: number;
}

/**
 * 現在の世帯情報の詳細を取得
 */
export async function getHouseholdInfo(): Promise<HouseholdDetail | null> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { householdId } = await getEffectiveHousehold(supabase);

    if (!householdId) {
      return null;
    }

    // households 情報を取得
    const { data: hhData, error: hhErr } = await admin
      .from("households")
      .select("*")
      .eq("id", householdId)
      .single();

    if (hhErr || !hhData) {
      // デモ環境等のフォールバック
      return {
        id: householdId,
        name: "我が家のパントリー",
        createdAt: new Date().toISOString(),
        memberCount: 1,
        members: [{ id: "user-1", fullName: "管理者", avatarUrl: null, role: "owner" }],
        activeDeviceCount: 1,
      };
    }

    // メンバー一覧を取得
    const { data: membersData } = await admin
      .from("users")
      .select("id, full_name, avatar_url, role")
      .eq("household_id", householdId);

    // 連携中のデバイス数を取得
    const { count: deviceCount } = await admin
      .from("device_link_sessions")
      .select("*", { count: "exact", head: true })
      .eq("household_id", householdId)
      .eq("status", "consumed");

    const members = (membersData || []).map((m) => ({
      id: m.id,
      fullName: m.full_name,
      avatarUrl: m.avatar_url,
      role: m.role,
    }));

    return {
      id: hhData.id,
      name: hhData.name,
      createdAt: hhData.created_at,
      memberCount: members.length || 1,
      members,
      activeDeviceCount: deviceCount || 0,
    };
  } catch (err) {
    console.error("Failed to get household info:", err);
    return null;
  }
}

/**
 * 世帯名の更新
 */
export async function updateHouseholdName(
  name: string
): Promise<{ success: boolean; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: "世帯名を入力してください" };
  }

  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { householdId } = await getEffectiveHousehold(supabase);

    if (!householdId) {
      return { success: false, error: "世帯が見つかりません" };
    }

    const { error } = await admin
      .from("households")
      .update({
        name: trimmed,
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq("id", householdId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "世帯名の更新に失敗しました",
    };
  }
}

/**
 * 招待された世帯（householdId）に現在のログインユーザーを参加させる
 */
export async function joinHousehold(
  targetHouseholdId: string
): Promise<{ success: boolean; householdName?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "世帯に参加するにはGoogleログインが必要です" };
    }

    const cleanId = targetHouseholdId.trim();
    if (!cleanId) {
      return { success: false, error: "世帯IDを入力してください" };
    }

    // 対象世帯の存在確認
    const { data: targetHh, error: hhErr } = await admin
      .from("households")
      .select("id, name")
      .eq("id", cleanId)
      .single();

    if (hhErr || !targetHh) {
      return {
        success: false,
        error: "指定された世帯が見つかりませんでした。世帯IDをご確認ください。",
      };
    }

    // users レコードの household_id を更新（存在しない場合は挿入）
    const { data: existingUser } = await admin
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existingUser) {
      const { error: userErr } = await admin
        .from("users")
        .update({
          household_id: targetHh.id,
          role: "member",
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", user.id);

      if (userErr) {
        return { success: false, error: `参加に失敗しました: ${userErr.message}` };
      }
    } else {
      const { error: insertErr } = await admin
        .from("users")
        .insert([
          {
            id: user.id,
            household_id: targetHh.id,
            role: "member",
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
          },
        ] as unknown as never);

      if (insertErr) {
        return { success: false, error: `参加に失敗しました: ${insertErr.message}` };
      }
    }

    revalidatePath("/");
    return { success: true, householdName: targetHh.name };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "世帯への参加処理中にエラーが発生しました",
    };
  }
}
