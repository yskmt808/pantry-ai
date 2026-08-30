import "@testing-library/jest-dom";
import { vi } from "vitest";

// CI/テスト環境用ダミー環境変数の初期化
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "placeholder-service-role-key";
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
process.env.NODE_ENV = "test";
process.env.VITEST = "true";

// next/headers の cookies() をモック
const mockCookiesStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: (key: string) => ({ value: mockCookiesStore.get(key) }),
    set: (key: string, value: string) => {
      mockCookiesStore.set(key, value);
    },
    delete: (key: string) => {
      mockCookiesStore.delete(key);
    },
  })),
}));

// next/cache の revalidatePath をモック
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
