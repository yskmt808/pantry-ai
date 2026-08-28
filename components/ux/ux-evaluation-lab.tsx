"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UX_SCENARIOS, type UXScenario, calculateScenarioUxScore } from "@/lib/ux/scenarios";
import {
  FlaskConical,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  User,
  Activity,
  HeartHandshake,
  Lightbulb,
  Zap,
} from "lucide-react";

export function UxEvaluationLab() {
  const [open, setOpen] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(UX_SCENARIOS[0].id);

  const selectedScenario =
    UX_SCENARIOS.find((s) => s.id === selectedScenarioId) || UX_SCENARIOS[0];

  const score = calculateScenarioUxScore(selectedScenario);

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-neutral-900/90 text-white px-4 py-2.5 shadow-xl shadow-neutral-900/20 border border-neutral-700/60 backdrop-blur-md hover:bg-neutral-800 hover:scale-105 transition-all dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:shadow-emerald-950/40"
        title="ユーザー体験評価（UX Lab）を開く"
      >
        <FlaskConical className="h-4 w-4 text-emerald-400 dark:text-white" />
        <span className="text-xs font-bold tracking-tight">UX Evaluation Lab</span>
        <Badge variant="default" className="text-[10px] bg-emerald-500 text-neutral-950 px-1.5 py-0">
          評価中
        </Badge>
      </button>

      {/* Lab Modal */}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="🧪 UX Evaluation Lab (ユーザー体感・最適化評価)"
        description="日常の利用シーン（ユースケース）と、それを支える操作性・認知負荷・体感スコアを診断します。"
      >
        <div className="space-y-4 pt-1">
          {/* Scenario Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl">
            {UX_SCENARIOS.map((scenario) => {
              const isSelected = scenario.id === selectedScenario.id;
              return (
                <button
                  key={scenario.id}
                  onClick={() => setSelectedScenarioId(scenario.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-center transition-all line-clamp-1 ${
                    isSelected
                      ? "bg-white text-emerald-800 shadow-sm dark:bg-neutral-900 dark:text-emerald-300"
                      : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
                >
                  {scenario.tag}
                </button>
              );
            })}
          </div>

          {/* Selected Scenario Header & Score Summary */}
          <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-[10px]">
                  {selectedScenario.tag}
                </Badge>
                <span className="text-xs text-neutral-400">ID: {selectedScenario.id}</span>
              </div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                {selectedScenario.title}
              </h3>
            </div>

            {/* UX Score Gauge */}
            <div className="flex items-center gap-3 bg-white dark:bg-neutral-800 p-2.5 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 shrink-0">
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-neutral-500 font-medium">総合UXスコア</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedScenario.verdict === "EXCELLENT" ? "極めて快適 (S+)" : "良好"}
                </span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-sm border border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300">
                {score}
              </div>
            </div>
          </div>

          {/* Persona & Situation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-xl border border-neutral-200/60 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                <User className="h-3.5 w-3.5 text-blue-500" />
                <span>ペルソナ & シチュエーション</span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
                {selectedScenario.situation}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200/60 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>達成したいゴール (体験目標)</span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
                {selectedScenario.goal}
              </p>
            </div>
          </div>

          {/* Steps & UX Evaluation */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
              <span>操作ステップとUX評価メトリクス</span>
            </span>

            <div className="space-y-2">
              {selectedScenario.steps.map((step) => (
                <div
                  key={step.stepNumber}
                  className="rounded-xl border border-neutral-200/60 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900/40 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[10px] dark:bg-emerald-950 dark:text-emerald-300">
                        {step.stepNumber}
                      </span>
                      {step.title}
                    </span>

                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-neutral-400">必要タップ数:</span>
                      <Badge variant="outline" className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800">
                        {step.actualTapCount} 回 (理想: {step.idealTapCount}回)
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-lg bg-neutral-50 p-2 text-[11px] text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">ユーザー心理:</span>{" "}
                    「{step.userIntent}」
                  </div>

                  {/* Highlights */}
                  <div className="space-y-1 pt-1">
                    {step.evaluationHighlights.map((hl, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verdict Summary */}
          <div className="rounded-xl bg-emerald-50/80 p-3 text-xs border border-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-900/60 flex items-start gap-2.5">
            <Lightbulb className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-950 dark:text-emerald-200">UX総括・体感メリット:</span>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                {selectedScenario.summary}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={() => setOpen(false)}>
              閉じる
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
