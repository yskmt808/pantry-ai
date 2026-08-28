import { describe, it, expect } from "vitest";
import {
  initiateDeviceLink,
  getDeviceLinkSessionInfo,
  authorizeDeviceLink,
  checkDeviceLinkStatus,
  consumeDeviceLink,
} from "@/app/actions/device-auth";

describe("共有端末 QRコードクロスデバイス連携認証 (Device Flow Tests)", () => {
  it("共有端末側でセッションを発行した際、deviceCode, 4桁のuserCode, 5分間の有効期限が生成されること", async () => {
    const res = await initiateDeviceLink("冷蔵庫のiPad", "https://pantry-ai.example.com");

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.deviceCode).toHaveLength(32);
    expect(res.data?.userCode).toHaveLength(4);
    expect(res.data?.deviceName).toBe("冷蔵庫のiPad");
    expect(res.data?.linkUrl).toContain("/link-device?code=");
    expect(res.data?.status).toBe("pending");

    // 有効期限が約5分後であること
    const expiresAt = new Date(res.data!.expiresAt).getTime();
    const now = Date.now();
    expect(expiresAt - now).toBeGreaterThan(4 * 60 * 1000);
    expect(expiresAt - now).toBeLessThanOrEqual(5 * 60 * 1000 + 1000);
  });

  it("スマホ側でQRコードのリンクを開いた際、セッション情報が正しく取得できること", async () => {
    const initRes = await initiateDeviceLink("キッチンiPad");
    const deviceCode = initRes.data!.deviceCode;

    const infoRes = await getDeviceLinkSessionInfo(deviceCode);
    expect(infoRes.success).toBe(true);
    expect(infoRes.data?.deviceName).toBe("キッチンiPad");
    expect(infoRes.data?.userCode).toBe(initRes.data!.userCode);
    expect(infoRes.data?.isExpired).toBe(false);
    expect(infoRes.data?.status).toBe("pending");
  });

  it("スマホ側で「承認」を実行した際、status が approved になり、端末側が検知・消費できること", async () => {
    const initRes = await initiateDeviceLink("冷蔵庫iPad");
    const deviceCode = initRes.data!.deviceCode;

    // 1. 最初は pending
    const statusBefore = await checkDeviceLinkStatus(deviceCode);
    expect(statusBefore.status).toBe("pending");

    // 2. スマホで承認
    const authRes = await authorizeDeviceLink(deviceCode);
    expect(authRes.success).toBe(true);

    // 3. 端末側のポーリングで approved を検知
    const statusAfter = await checkDeviceLinkStatus(deviceCode);
    expect(statusAfter.status).toBe("approved");

    // 4. 端末側でセッション確立 (consumed)
    const consumeRes = await consumeDeviceLink(deviceCode);
    expect(consumeRes.success).toBe(true);
    expect(consumeRes.householdId).toBeDefined();

    // 5. 二重利用防止 (consumed)
    const statusFinal = await checkDeviceLinkStatus(deviceCode);
    expect(statusFinal.status).toBe("consumed");
  });

  it("無効な deviceCode を指定した場合、適切にエラーが返ること", async () => {
    const infoRes = await getDeviceLinkSessionInfo("invalid-non-existent-code");
    expect(infoRes.success).toBe(false);
  });
});
