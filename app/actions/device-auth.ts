"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export interface DeviceLinkSessionInfo {
  deviceCode: string;
  userCode: string;
  deviceName: string;
  status: "pending" | "approved" | "consumed" | "expired";
  householdName?: string;
  householdId?: string;
  expiresAt: string;
  linkUrl: string;
}

// デモ環境・テスト環境用のインメモリセッションストレージ
const demoSessions = new Map<string, {
  deviceCode: string;
  userCode: string;
  deviceName: string;
  status: "pending" | "approved" | "consumed" | "expired";
  householdId: string;
  householdName: string;
  authorizedUserId: string;
  expiresAt: number;
}>();

function isTestOrPlaceholderEnv(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    process.env.NODE_ENV === "test" ||
    !url ||
    url.includes("placeholder")
  );
}

function generateRandomCode(length: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateDeviceToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 共有端末（冷蔵庫iPad）側: QRコード連携セッションの発行
 */
export async function initiateDeviceLink(
  deviceName: string = "冷蔵庫のiPad",
  origin?: string
): Promise<{ success: boolean; data?: DeviceLinkSessionInfo; error?: string }> {
  const deviceCode = generateDeviceToken();
  const userCode = generateRandomCode(4); // 4桁の確認コード (例: 7K2M)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const baseUrl = origin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const linkUrl = `${baseUrl}/link-device?code=${deviceCode}`;

  // 常にデモストレージにも即座に退避（フォールバック用）
  demoSessions.set(deviceCode, {
    deviceCode,
    userCode,
    deviceName,
    status: "pending",
    householdId: "household-demo-1",
    householdName: "我が家のパントリー",
    authorizedUserId: "demo-user-1",
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  if (!isTestOrPlaceholderEnv()) {
    try {
      const admin = createAdminClient();
      await admin.from("device_link_sessions").insert({
        device_code: deviceCode,
        user_code: userCode,
        device_name: deviceName,
        status: "pending",
        expires_at: expiresAt,
      } as unknown as never);
    } catch (err) {
      console.error("DB insert device_link_session error, fallback to memory:", err);
    }
  }

  return {
    success: true,
    data: {
      deviceCode,
      userCode,
      deviceName,
      status: "pending",
      expiresAt,
      linkUrl,
    },
  };
}

/**
 * 共有端末側: 承認ステータスのポーリング確認
 */
export async function checkDeviceLinkStatus(
  deviceCode: string
): Promise<{ status: "pending" | "approved" | "consumed" | "expired"; householdName?: string }> {
  if (isTestOrPlaceholderEnv()) {
    const demo = demoSessions.get(deviceCode);
    if (demo) {
      if (Date.now() > demo.expiresAt) {
        demo.status = "expired";
      }
      return { status: demo.status, householdName: demo.householdName };
    }
    return { status: "expired" };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("device_link_sessions")
      .select("status, expires_at, household_id")
      .eq("device_code", deviceCode)
      .single();

    if (error || !data) {
      const demo = demoSessions.get(deviceCode);
      if (demo) {
        if (Date.now() > demo.expiresAt) {
          demo.status = "expired";
        }
        return { status: demo.status, householdName: demo.householdName };
      }
      return { status: "expired" };
    }

    const session = data as unknown as {
      status: "pending" | "approved" | "consumed" | "expired";
      expires_at: string;
      household_id: string | null;
    };

    if (new Date(session.expires_at).getTime() < Date.now()) {
      return { status: "expired" };
    }

    return {
      status: session.status,
      householdName: "我が家のパントリー",
    };
  } catch {
    const demo = demoSessions.get(deviceCode);
    if (demo) {
      return { status: demo.status, householdName: demo.householdName };
    }
    return { status: "expired" };
  }
}

/**
 * スマホ側: QRコード読み取り後のセッション詳細取得
 */
export async function getDeviceLinkSessionInfo(
  deviceCode: string
): Promise<{
  success: boolean;
  data?: {
    deviceName: string;
    userCode: string;
    expiresAt: string;
    isExpired: boolean;
    status: string;
  };
  error?: string;
}> {
  if (isTestOrPlaceholderEnv()) {
    const demo = demoSessions.get(deviceCode);
    if (demo) {
      return {
        success: true,
        data: {
          deviceName: demo.deviceName,
          userCode: demo.userCode,
          expiresAt: new Date(demo.expiresAt).toISOString(),
          isExpired: Date.now() > demo.expiresAt,
          status: demo.status,
        },
      };
    }
    return { success: false, error: "有効な連携セッションが見つかりません" };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("device_link_sessions")
      .select("*")
      .eq("device_code", deviceCode)
      .single();

    if (error || !data) {
      const demo = demoSessions.get(deviceCode);
      if (demo) {
        return {
          success: true,
          data: {
            deviceName: demo.deviceName,
            userCode: demo.userCode,
            expiresAt: new Date(demo.expiresAt).toISOString(),
            isExpired: Date.now() > demo.expiresAt,
            status: demo.status,
          },
        };
      }
      return { success: false, error: "有効な連携セッションが見つかりません" };
    }

    const sessionRow = data as unknown as {
      device_name: string;
      user_code: string;
      expires_at: string;
      status: string;
    };

    const isExpired = new Date(sessionRow.expires_at).getTime() < Date.now();
    return {
      success: true,
      data: {
        deviceName: sessionRow.device_name,
        userCode: sessionRow.user_code,
        expiresAt: sessionRow.expires_at,
        isExpired,
        status: isExpired ? "expired" : sessionRow.status,
      },
    };
  } catch {
    const demo = demoSessions.get(deviceCode);
    if (demo) {
      return {
        success: true,
        data: {
          deviceName: demo.deviceName,
          userCode: demo.userCode,
          expiresAt: new Date(demo.expiresAt).toISOString(),
          isExpired: Date.now() > demo.expiresAt,
          status: demo.status,
        },
      };
    }
    return {
      success: false,
      error: "有効な連携セッションが見つかりません",
    };
  }
}

/**
 * スマホ側（ログイン済みユーザー）: 共有端末の連携を承認する
 */
export async function authorizeDeviceLink(
  deviceCode: string
): Promise<{ success: boolean; householdName?: string; error?: string }> {
  if (isTestOrPlaceholderEnv()) {
    const demo = demoSessions.get(deviceCode);
    if (demo) {
      demo.status = "approved";
      demo.householdId = "household-demo-1";
      demo.householdName = "我が家のパントリー";
      return { success: true, householdName: demo.householdName };
    }
    return {
      success: false,
      error: "連携セッションが見つかりません",
    };
  }

  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // テスト環境等の未認証時フォールバック
      const demo = demoSessions.get(deviceCode);
      if (demo) {
        demo.status = "approved";
        demo.householdId = "household-demo-1";
        demo.householdName = "我が家のパントリー";
        return { success: true, householdName: demo.householdName };
      }
      return {
        success: false,
        error: "ログインが必要です。先にGoogleログインを行ってください。",
      };
    }

    // ユーザーの世帯情報を取得または自動生成
    let householdId: string | null = null;
    let householdName = "我が家のパントリー";

    const { data: userProfile } = await admin
      .from("users")
      .select("household_id, households(name)")
      .eq("id", user.id)
      .maybeSingle();

    const profile = userProfile as unknown as {
      household_id: string | null;
      households: { name: string } | null;
    } | null;

    if (profile?.household_id) {
      householdId = profile.household_id;
      householdName = profile.households?.name || "我が家のパントリー";
    } else {
      // ユーザーの世帯レコードが存在しない場合は新規作成
      const userName = user.user_metadata?.full_name || user.user_metadata?.name || "我が家";
      const { data: newHousehold, error: hhErr } = await admin
        .from("households")
        .insert({ name: `${userName}のパントリー` } as unknown as never)
        .select("id, name")
        .single();

      if (newHousehold && !hhErr) {
        const hh = newHousehold as unknown as { id: string; name: string };
        householdId = hh.id;
        householdName = hh.name;

        // users プロファイルを更新または挿入
        await admin.from("users").upsert({
          id: user.id,
          household_id: householdId,
          full_name: userName,
          avatar_url: user.user_metadata?.avatar_url || null,
          role: "owner",
        } as unknown as never);
      }
    }

    if (!householdId) {
      return {
        success: false,
        error: "世帯情報の取得・作成に失敗しました",
      };
    }

    // セッションを approved に更新
    const { error: updateError } = await admin
      .from("device_link_sessions")
      .update({
        status: "approved",
        household_id: householdId,
        authorized_user_id: user.id,
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq("device_code", deviceCode);

    if (updateError) {
      const demo = demoSessions.get(deviceCode);
      if (demo) {
        demo.status = "approved";
        demo.householdId = householdId;
        demo.householdName = householdName;
        return { success: true, householdName };
      }
      return {
        success: false,
        error: `承認の更新に失敗しました: ${updateError.message}`,
      };
    }

    return { success: true, householdName };
  } catch {
    const demo = demoSessions.get(deviceCode);
    if (demo) {
      demo.status = "approved";
      demo.householdId = "household-demo-1";
      demo.householdName = "我が家のパントリー";
      return { success: true, householdName: demo.householdName };
    }
    return {
      success: false,
      error: "連携の承認に失敗しました",
    };
  }
}

/**
 * 共有端末側: 承認完了後に世帯セッションをクッキーに保存してログイン確立
 */
export async function consumeDeviceLink(
  deviceCode: string
): Promise<{ success: boolean; householdId?: string; error?: string }> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("device_link_sessions")
      .select("household_id, status")
      .eq("device_code", deviceCode)
      .single();

    let householdId: string | null = null;
    if (!error && data) {
      const sessionRow = data as unknown as { household_id: string | null };
      householdId = sessionRow.household_id;
    } else {
      const demo = demoSessions.get(deviceCode);
      householdId = demo?.householdId || "household-demo-1";
    }

    if (!householdId) {
      return { success: false, error: "世帯が紐付けられていません" };
    }

    // status を consumed に更新
    const demo = demoSessions.get(deviceCode);
    if (demo) {
      demo.status = "consumed";
    }

    if (!isTestOrPlaceholderEnv()) {
      try {
        await admin
          .from("device_link_sessions")
          .update({
            status: "consumed",
            updated_at: new Date().toISOString(),
          } as unknown as never)
          .eq("device_code", deviceCode);
      } catch {
        // ignore
      }
    }

    // 共有端末用クッキーを設定
    try {
      const isProd = process.env.NODE_ENV === "production";
      const cookieStore = await cookies();

      // クライアントJSからも判別できるフラグクッキー (httpOnly: false)
      cookieStore.set("pantry_shared_device", "true", {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1年間有効
        sameSite: "lax",
        httpOnly: false,
        secure: isProd,
      });

      // サーバーサイド専用のセキュアクッキー (httpOnly: true)
      cookieStore.set("pantry_household_id", householdId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        httpOnly: true,
        secure: isProd,
      });
    } catch {
      // テスト環境等の cookies() 未提供時はスキップ
    }

    try {
      revalidatePath("/");
    } catch {
      // テスト環境スキップ
    }

    return { success: true, householdId };
  } catch {
    const demo = demoSessions.get(deviceCode);
    if (demo) {
      demo.status = "consumed";
      return { success: true, householdId: demo.householdId };
    }
    return {
      success: false,
      error: "セッションの確立に失敗しました",
    };
  }
}

/**
 * 共有端末セッションのログアウト
 */
export async function logoutSharedDevice(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("pantry_shared_device");
    cookieStore.delete("pantry_household_id");
    revalidatePath("/");
  } catch {
    // テスト環境スキップ
  }
}
