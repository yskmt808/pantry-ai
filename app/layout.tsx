import type { Metadata } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { AuthButton } from "@/components/auth/auth-button";
import { Sparkles, Refrigerator } from "lucide-react";

export const metadata: Metadata = {
  title: "pantry-ai | 家庭内在庫管理 & AI執事",
  description: "家族向け在庫管理・AI献立提案 PWA",
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="ja">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-50">
        {/* Header Navigation */}
        <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/30">
                <Refrigerator className="h-5 w-5" />
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-400">
                  pantry-ai
                </span>
                <span className="ml-2 hidden rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 sm:inline-block">
                  AI執事
                </span>
              </div>
            </div>

            {/* Auth Actions */}
            <div className="flex items-center gap-3">
              <AuthButton user={user} />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          {children}
        </div>
      </body>
    </html>
  );
}
