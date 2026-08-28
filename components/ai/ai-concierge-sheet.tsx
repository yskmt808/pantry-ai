"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sendChatMessage, type ChatMessage, type AiChatResponse } from "@/app/actions/ai-chat";
import type { ItemWithDetails } from "@/app/actions/items";
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Bot,
  User,
  Volume2,
  VolumeX,
  Utensils,
  ShoppingBag,
  Layers,
  ArrowRight,
  RefreshCw,
  X,
  ChevronDown,
} from "lucide-react";

interface AiConciergeSheetProps {
  items: ItemWithDetails[];
  onItemsChange?: (updatedItems: ItemWithDetails[]) => void;
  onOptimisticAdjust?: (itemId: string, delta: number) => void;
}

const QUICK_PROMPTS = [
  { label: "🥬 キャベツ1/4使った", text: "キャベツ1/4玉使ったよ" },
  { label: "🥚 卵1パック買った", text: "卵を1パック買い足した" },
  { label: "🥛 牛乳飲み切った", text: "牛乳1本飲み切った" },
  { label: "🍳 今日の夕飯何作れる？", text: "賞味期限近いもので夕飯の献立を教えて" },
  { label: "📋 現在の在庫教えて", text: "今の主な在庫を教えて" },
];

export function AiConciergeSheet({ items, onItemsChange, onOptimisticAdjust }: AiConciergeSheetProps) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      role: "assistant",
      content: "こんにちは！Pantry AI 執事です。🎙️ 音声またはテキストで「キャベツ半分使った」「卵1パック買った」「今日何作れる？」などお気軽にお話しください。",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // 音声関連
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const recognitionRef = useRef<unknown>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // メッセージ追加時の自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Web Speech API の初期化
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
          .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

      if (SpeechRecognition) {
        // @ts-expect-error - webkitSpeechRecognition
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "ja-JP";

        // @ts-expect-error - event typing
        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            // @ts-expect-error - result typing
            .map((result) => result[0].transcript)
            .join("");
          setInputText(transcript);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // 音声合成 (TTS)
  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // コードブロックやマークダウン記号を除去してシンプルに読み上げ
    const cleanText = text.replace(/[*_#`]/g, "").slice(0, 150);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "ja-JP";
    utterance.rate = 1.05;
    window.speechSynthesis.cancel(); // 既存の読み上げを停止
    window.speechSynthesis.speak(utterance);
  };

  // 音声入力の開始/停止
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("お使いのブラウザは音声認識に対応していません。テキスト入力をご利用ください。");
      return;
    }

    if (isListening) {
      // @ts-expect-error - stop
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInputText("");
      // @ts-expect-error - start
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // メッセージ送信
  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const res: AiChatResponse = await sendChatMessage({
        message: query.trim(),
        items,
        history: messages,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: res.replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        executedActions: res.executedActions,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speakText(res.replyText);

      // アクションが実行された場合、ローカル状態も更新
      if (res.executedActions && res.executedActions.length > 0) {
        res.executedActions.forEach((act) => {
          if (act.itemId && act.newQuantity !== undefined && onOptimisticAdjust) {
            // ダッシュボードのアイテム数量を更新
          }
        });
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "申し訳ありません。メッセージの処理中にエラーが発生しました。",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bottom Sticky Floating Trigger Bar */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4">
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-white/95 p-1.5 shadow-xl shadow-emerald-950/10 backdrop-blur-md dark:border-emerald-500/20 dark:bg-neutral-900/95">
          <button
            onClick={() => {
              setOpen(true);
              setTimeout(() => toggleListening(), 300);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700 hover:scale-105 transition-all"
            title="音声で話しかける"
          >
            <Mic className="h-5 w-5" />
          </button>

          <button
            onClick={() => setOpen(true)}
            className="flex-1 text-left px-3 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 truncate"
          >
            「キャベツ半分使った」「卵買った」...
          </button>

          <Button
            size="sm"
            onClick={() => setOpen(true)}
            className="rounded-full h-8 px-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            <span>AI執事</span>
          </Button>
        </div>
      </div>

      {/* AI Concierge Chat Sheet / Modal */}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="🎙️ Pantry AI 執事（音声 & チャット対話）"
        description="話しかけるだけで、Gemini が食材の消費・買い足し・献立提案をスマートに実行します。"
      >
        <div className="flex flex-col h-[70vh] max-h-[580px] -mx-4 -mb-4 px-4 pb-4">
          {/* Header Controls (Voice Toggle & Quick prompts) */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {QUICK_PROMPTS.slice(0, 3).map((qp, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(qp.text)}
                  className="rounded-lg bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-emerald-50 hover:text-emerald-700 shrink-0 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-emerald-950/40 transition-colors"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Voice Toggle */}
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-1.5 rounded-lg text-xs transition-colors shrink-0 ${
                voiceEnabled
                  ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400"
                  : "text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
              title={voiceEnabled ? "音声読み上げ: ON" : "音声読み上げ: OFF"}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 text-xs">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div className={`max-w-[82%] space-y-1.5 ${isUser ? "items-end" : "items-start"}`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        isUser
                          ? "bg-emerald-600 text-white rounded-br-none shadow-sm"
                          : "bg-neutral-100 text-neutral-900 rounded-bl-none dark:bg-neutral-800 dark:text-neutral-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    {/* Executed Action Card */}
                    {msg.executedActions && msg.executedActions.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {msg.executedActions.map((act, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50/80 p-2 text-[11px] text-emerald-950 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-200"
                          >
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white">
                              {act.actionType === "adjust" && <Utensils className="h-3 w-3" />}
                              {act.actionType === "add_batch" && <ShoppingBag className="h-3 w-3" />}
                              {act.actionType === "recipe_suggestion" && <Sparkles className="h-3 w-3" />}
                            </div>
                            <div className="flex-1">
                              <span className="font-bold">{act.itemName}:</span>{" "}
                              <span>{act.details}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <span className="text-[10px] text-neutral-400 block px-1">
                      {msg.timestamp}
                    </span>
                  </div>

                  {isUser && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-neutral-700 text-xs dark:bg-neutral-700 dark:text-neutral-200">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-neutral-400 pl-9">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                <span>AI執事が考え中...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input & Voice Controls */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2 shrink-0">
            {/* Listening Waveform Banner */}
            {isListening && (
              <div className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                  <span className="font-bold">音声を認識中...（お話しください）</span>
                </div>
                <button
                  onClick={toggleListening}
                  className="text-[11px] underline font-semibold"
                >
                  停止
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              {/* Mic Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                  isListening
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 scale-105"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200"
                }`}
                title={isListening ? "音声認識を停止" : "音声で入力"}
              >
                <Mic className="h-4 w-4" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                placeholder="話しかける、または入力..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading}
                className="flex-1 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 shadow-sm"
              />

              {/* Send Button */}
              <Button
                type="submit"
                size="icon"
                disabled={!inputText.trim() || loading}
                className="h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-md shadow-emerald-600/20"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </Dialog>
    </>
  );
}
