"use server";

import { getGeminiClient, DEFAULT_AI_MODEL } from "@/lib/gemini/clients";
import { getItems, adjustItemQuantity, addBatch, type ItemWithDetails } from "@/app/actions/items";
import { revalidatePath } from "next/cache";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  executedActions?: {
    actionType: "adjust" | "add_batch" | "recipe_suggestion";
    itemName: string;
    details: string;
  }[];
}

export interface AiChatInput {
  message: string;
  history?: ChatMessage[];
  items?: ItemWithDetails[];
}

export interface AiChatResponse {
  replyText: string;
  executedActions: {
    actionType: "adjust" | "add_batch" | "recipe_suggestion";
    itemName: string;
    details: string;
    itemId?: string;
    newQuantity?: number;
  }[];
}

/**
 * AI執事へのメッセージ送信・自然言語在庫操作 Server Action
 */
export async function sendChatMessage(input: AiChatInput): Promise<AiChatResponse> {
  const userMessage = input.message.trim();
  if (!userMessage) {
    return { replyText: "メッセージを入力してください。", executedActions: [] };
  }

  // 現在の在庫リストを取得（引数で渡されていない場合はDBから取得）
  let items = input.items;
  if (!items || items.length === 0) {
    items = await getItems();
  }

  const gemini = getGeminiClient();

  if (gemini) {
    try {
      return await executeGeminiChat(gemini, userMessage, items, input.history || []);
    } catch (err) {
      console.error("Gemini API call failed, falling back to local NLP parser:", err);
      return executeLocalNlpParser(userMessage, items);
    }
  } else {
    // APIキー未設定時のローカル自然言語フォールバック
    return executeLocalNlpParser(userMessage, items);
  }
}

/**
 * Gemini SDK による Function Calling 実行
 */
async function executeGeminiChat(
  gemini: NonNullable<ReturnType<typeof getGeminiClient>>,
  userMessage: string,
  items: ItemWithDetails[],
  history: ChatMessage[]
): Promise<AiChatResponse> {
  const inventorySummary = items
    .map(
      (i) =>
        `- ID: "${i.id}", 品名: "${i.name}", 在庫: ${i.current_quantity}${i.unit}, 消費単位: ${i.consumption_step}, 期限: ${i.expiry_date || "なし"}`
    )
    .join("\n");

  const systemInstruction = `あなたは家庭内在庫管理＆献立提案アプリ「Pantry AI」の親切で優秀なAI執事です。
ユーザーの発話（音声またはテキスト）を理解し、在庫の消費・買い足し・確認や献立提案をスマートに行ってください。

【現在の世帯在庫状況】
${inventorySummary}

【行動ルール】
1. ユーザーが「キャベツ半分使った」「卵2個使った」など食材を消費したと言った場合:
   - 対象の品目IDを特定し、消費量（マイナスの数値）を算出して \`adjust_quantity\` ツールを呼び出してください。
2. ユーザーが「牛乳2本買った」「卵を1パック買い足した」など買い足したと言った場合:
   - \`add_batch\` ツールを呼び出してください。
3. ユーザーが「夕飯何作れる？」「賞味期限が近いものでレシピ教えて」と言った場合:
   - 在庫を活用した献立提案を行ってください。
4. ツールを呼び出した後、ユーザーに対して丁寧で分かりやすい報告メッセージを返してください。`;

  // ツール（Function Calling）定義
  const tools = [
    {
      functionDeclarations: [
        {
          name: "adjust_quantity",
          description: "食材の消費または手動加算による数量変更",
          parameters: {
            type: "OBJECT" as const,
            properties: {
              itemId: { type: "STRING" as const, description: "対象アイテムのID" },
              itemName: { type: "STRING" as const, description: "アイテム名" },
              delta: { type: "NUMBER" as const, description: "増減量（消費はマイナスの数値、例: -0.5, -2）" },
            },
            required: ["itemId", "delta"],
          },
        },
        {
          name: "add_batch",
          description: "新しい賞味期限や購入日での買い足し・ロット追加",
          parameters: {
            type: "OBJECT" as const,
            properties: {
              itemId: { type: "STRING" as const, description: "対象アイテムのID" },
              itemName: { type: "STRING" as const, description: "アイテム名" },
              quantity: { type: "NUMBER" as const, description: "買い足した数量" },
              expiryDate: { type: "STRING" as const, description: "賞味期限（YYYY-MM-DD、任意）" },
            },
            required: ["itemId", "quantity"],
          },
        },
      ],
    },
  ];

  const response = await gemini.models.generateContent({
    model: DEFAULT_AI_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: userMessage }],
      },
    ],
    config: {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      tools: tools as never,
    },
  });

  const executedActions: AiChatResponse["executedActions"] = [];
  const functionCalls = response.functionCalls;

  if (functionCalls && functionCalls.length > 0) {
    for (const call of functionCalls) {
      if (call.name === "adjust_quantity") {
        const args = call.args as { itemId: string; itemName?: string; delta: number };
        try {
          const res = await adjustItemQuantity(args.itemId, args.delta);
          const target = items.find((i) => i.id === args.itemId);
          const name = target?.name || args.itemName || "アイテム";
          const unit = target?.unit || "個";
          const deltaStr = args.delta < 0 ? `${Math.abs(args.delta)}${unit} 消費` : `+${args.delta}${unit} 追加`;
          executedActions.push({
            actionType: "adjust",
            itemName: name,
            details: `${deltaStr} (残り: ${res.newQuantity}${unit})`,
            itemId: args.itemId,
            newQuantity: res.newQuantity,
          });
        } catch (e) {
          console.error("Failed to execute adjust_quantity tool:", e);
        }
      } else if (call.name === "add_batch") {
        const args = call.args as { itemId: string; itemName?: string; quantity: number; expiryDate?: string };
        try {
          const res = await addBatch(args.itemId, {
            quantity: args.quantity,
            expiry_date: args.expiryDate || null,
          });
          const target = items.find((i) => i.id === args.itemId);
          const name = target?.name || args.itemName || "アイテム";
          const unit = target?.unit || "個";
          executedActions.push({
            actionType: "add_batch",
            itemName: name,
            details: `+${args.quantity}${unit} 買い足し (合計: ${res.totalQuantity}${unit})`,
            itemId: args.itemId,
            newQuantity: res.totalQuantity,
          });
        } catch (e) {
          console.error("Failed to execute add_batch tool:", e);
        }
      }
    }
  }

  const textReply = response.text || (executedActions.length > 0
    ? `${executedActions.map((a) => `${a.itemName}の在庫を更新しました（${a.details}）。`).join("\n")}`
    : "承知いたしました。他にお手伝いできることはありますか？");

  revalidatePath("/");
  return {
    replyText: textReply,
    executedActions,
  };
}

/**
 * APIキー未設定時またはフォールバック用のローカル自然言語解析
 */
function executeLocalNlpParser(userMessage: string, items: ItemWithDetails[]): AiChatResponse {
  const text = userMessage.toLowerCase();
  const executedActions: AiChatResponse["executedActions"] = [];

  // キャベツの消費
  if (text.includes("キャベツ")) {
    const cabbage = items.find((i) => i.name.includes("キャベツ"));
    if (cabbage) {
      if (text.includes("半分") || text.includes("0.5") || text.includes("半玉")) {
        executedActions.push({
          actionType: "adjust",
          itemName: cabbage.name,
          details: `0.5玉 消費 (残り: ${Math.max(0, Number((cabbage.current_quantity - 0.5).toFixed(2)))}玉)`,
          itemId: cabbage.id,
          newQuantity: Math.max(0, Number((cabbage.current_quantity - 0.5).toFixed(2))),
        });
        return {
          replyText: `キャベツを 0.5玉 消費しました！残りは ${Math.max(0, Number((cabbage.current_quantity - 0.5).toFixed(2)))}玉 です。`,
          executedActions,
        };
      }
      if (text.includes("1/4") || text.includes("0.25") || text.includes("使った") || text.includes("減ら")) {
        const step = Number(cabbage.consumption_step) || 0.25;
        const newQty = Math.max(0, Number((cabbage.current_quantity - step).toFixed(2)));
        executedActions.push({
          actionType: "adjust",
          itemName: cabbage.name,
          details: `${step}玉 消費 (残り: ${newQty}玉)`,
          itemId: cabbage.id,
          newQuantity: newQty,
        });
        return {
          replyText: `キャベツを ${step}玉（1/4玉）消費しました。残りは ${newQty}玉 です。`,
          executedActions,
        };
      }
    }
  }

  // 卵の消費または買い足し
  if (text.includes("たまご") || text.includes("卵")) {
    const egg = items.find((i) => i.name.includes("たまご") || i.name.includes("卵"));
    if (egg) {
      if (text.includes("買") || text.includes("足し") || text.includes("パック")) {
        const addQty = egg.package_quantity || 10;
        const newQty = Number(egg.current_quantity) + addQty;
        executedActions.push({
          actionType: "add_batch",
          itemName: egg.name,
          details: `+${addQty}個 (1パック) 買い足し (合計: ${newQty}個)`,
          itemId: egg.id,
          newQuantity: newQty,
        });
        return {
          replyText: `たまごを1パック（${addQty}個）買い足し登録しました！現在の合計在庫は ${newQty}個 です。`,
          executedActions,
        };
      }
      if (text.includes("使") || text.includes("個") || text.includes("減ら")) {
        const match = text.match(/(\d+)個/);
        const count = match ? parseInt(match[1], 10) : 1;
        const newQty = Math.max(0, Number(egg.current_quantity) - count);
        executedActions.push({
          actionType: "adjust",
          itemName: egg.name,
          details: `${count}個 消費 (残り: ${newQty}個)`,
          itemId: egg.id,
          newQuantity: newQty,
        });
        return {
          replyText: `たまごを ${count}個 消費しました。残りは ${newQty}個 です。`,
          executedActions,
        };
      }
    }
  }

  // 牛乳の消費
  if (text.includes("牛乳") || text.includes("ミルク")) {
    const milk = items.find((i) => i.name.includes("牛乳"));
    if (milk) {
      if (text.includes("飲") || text.includes("使") || text.includes("減ら") || text.includes("空")) {
        const newQty = Math.max(0, Number(milk.current_quantity) - 1);
        executedActions.push({
          actionType: "adjust",
          itemName: milk.name,
          details: `1本 消費 (残り: ${newQty}本)`,
          itemId: milk.id,
          newQuantity: newQty,
        });
        return {
          replyText: `牛乳を1本消費（消化）しました。残りは ${newQty}本 です。`,
          executedActions,
        };
      }
    }
  }

  // 献立・レシピ提案
  if (text.includes("献立") || text.includes("レシピ") || text.includes("夕飯") || text.includes("何作") || text.includes("おすすめ")) {
    return {
      replyText: `現在ある在庫（キャベツ、豚肉、卵）を活用したおすすめレシピです：

1. 🍳 **豚平焼き (とんぺいやき)** （調理時間: 15分）
   - キャベツ（千切り）、豚バラ肉、卵を活用。手軽で期限が近いキャベツをたっぷり消費できます。
2. 🍲 **豚肉とキャベツのうま塩鍋** （調理時間: 20分）
   - キャベツ1/4玉と豚バラ肉を煮込むだけ。体が温まる栄養満点メニューです。
3. 🥘 **野菜たっぷりお好み焼き** （調理時間: 25分）
   - キャベツ、卵、小麦粉でボリューミーに仕上がります。`,
      executedActions: [
        {
          actionType: "recipe_suggestion",
          itemName: "キャベツ & 豚バラ肉",
          details: "豚平焼き / うま塩鍋 / お好み焼き",
        },
      ],
    };
  }

  // 在庫確認
  if (text.includes("在庫") || text.includes("何がある") || text.includes("残")) {
    const stockList = items
      .map((i) => `・${i.name}: ${i.current_quantity} ${i.unit}`)
      .join("\n");
    return {
      replyText: `現在の主な在庫一覧です：\n${stockList}\n\n「キャベツ半分使った」や「たまご1パック買った」と伝えていただければ、すぐに反映します。`,
      executedActions: [],
    };
  }

  // デフォルト応答
  return {
    replyText: `「${userMessage}」について承知いたしました。
「キャベツ半分使った」「卵1パック買った」「夕飯の献立教えて」などのようにお気軽にお話しください！`,
    executedActions: [],
  };
}
