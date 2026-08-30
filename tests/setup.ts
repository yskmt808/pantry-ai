import "@testing-library/jest-dom";
import { vi } from "vitest";

// CI/テスト環境用ダミー環境変数の初期化
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "placeholder-service-role-key";
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
process.env.VITEST = "true";

// jsdom 環境用ポリフィル
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  const MockResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.ResizeObserver = MockResizeObserver;
  global.ResizeObserver = MockResizeObserver;

  const MockIntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
  window.IntersectionObserver = MockIntersectionObserver;
  global.IntersectionObserver = MockIntersectionObserver;

  window.scrollTo = vi.fn();
}

// next/headers の cookies() を確実にホイストしてモック
const { mockCookiesMap } = vi.hoisted(() => ({
  mockCookiesMap: new Map<string, string>(),
}));

vi.mock("next/headers", () => {
  return {
    cookies: async () => ({
      get: (key: string) => {
        const val = mockCookiesMap.get(key);
        return val ? { name: key, value: val } : undefined;
      },
      set: (key: string, value: string) => {
        mockCookiesMap.set(key, value);
      },
      delete: (key: string) => {
        mockCookiesMap.delete(key);
      },
    }),
    headers: async () => new Headers(),
  };
});

// next/cache の revalidatePath / revalidateTag をモック
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// next/navigation のモック
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));
