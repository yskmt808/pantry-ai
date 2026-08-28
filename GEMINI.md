# pantry-ai: 家庭内在庫管理 & AI執事 PWA

## 概要
Google OAuthを前提とした家族向け在庫管理・献立提案PWA。
冷蔵庫の画像解析（Gemini 2.5 Flash）、Amazon等の納品メール解析、自然言語による在庫操作・献立提案を行う。

## 技術スタック
- **Frontend & BFF:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **PWA:** next-pwa / Serwist
- **Backend & Database:** Supabase (PostgreSQL, Supabase Auth, Storage)
- **AI Engine:** Google Gen AI SDK (@google/genai), Gemini 2.5 Flash (Multimodal & Function Calling)
- **Hosting & CI/CD:** Vercel + GitHub Actions

## 主要データ構造
1. **households / users**: 家族グループとGoogle認証ユーザー
2. **items / item_procurement_channels**: 在庫物品、保管場所、調達ルート（実店舗・ネット・定期便）
3. **item_reference_images**: AI認識精度向上のためのマスタ登録画像
4. **shopping_list_items**: 買い物リスト & 担当者アサイン
5. **photo_analyses / inventory_logs**: 写真解析ログと在庫増減履歴

## コーディング原則
- Server ComponentsとClient Componentsを明確に分離する。
- DB操作はSupabase RLS（Row Level Security）を前提とし、型安全を維持する。
- AIの構造化出力は必ず `@google/genai` の `responseSchema` を使用する。
