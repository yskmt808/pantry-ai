import { describe, it, expect } from "vitest";
import { UX_SCENARIOS, calculateScenarioUxScore } from "@/lib/ux/scenarios";

describe("UXシナリオ & ユーザー体感メトリクス検証 (UX Evaluation Tests)", () => {
  it("すべての典型シナリオが総合UXスコア 90点以上（極めて快適）を達成していること", () => {
    UX_SCENARIOS.forEach((scenario) => {
      const score = calculateScenarioUxScore(scenario);
      expect(score).toBeGreaterThanOrEqual(90);
    });
  });

  it("【シナリオ① 週末卵買い足し】必要タップ数が理想値（2タップ以内）に収まっていること", () => {
    const eggScenario = UX_SCENARIOS.find((s) => s.id === "scenario-egg-bulk-buy");
    expect(eggScenario).toBeDefined();

    eggScenario?.steps.forEach((step) => {
      expect(step.actualTapCount).toBeLessThanOrEqual(step.idealTapCount);
      expect(step.cognitiveLoadScore).toBeGreaterThanOrEqual(9.0);
    });
  });

  it("【シナリオ② 料理中のキャベツ消費】1タップで端数消費が完結すること", () => {
    const cabbageScenario = UX_SCENARIOS.find((s) => s.id === "scenario-cabbage-fraction-consumption");
    expect(cabbageScenario).toBeDefined();

    const step1 = cabbageScenario?.steps[0];
    expect(step1?.actualTapCount).toBe(1); // 1タップのみ！
    expect(step1?.cognitiveLoadScore).toBe(10); // 認知負荷ゼロ
  });

  it("【シナリオ③ オリーブオイル開封】ストック全体ではなく1本だけ分離され、2タップ以内で開封できること", () => {
    const oilScenario = UX_SCENARIOS.find((s) => s.id === "scenario-oil-open-and-track");
    expect(oilScenario).toBeDefined();

    const step1 = oilScenario?.steps[0];
    expect(step1?.actualTapCount).toBeLessThanOrEqual(2);
  });

  it("【シナリオ④ フードロス記録】罪悪感を軽減し、2タップ以内で消費と区別して記録できること", () => {
    const wasteScenario = UX_SCENARIOS.find((s) => s.id === "scenario-food-waste-logging");
    expect(wasteScenario).toBeDefined();

    const step1 = wasteScenario?.steps[0];
    expect(step1?.actualTapCount).toBeLessThanOrEqual(2);
    expect(step1?.cognitiveLoadScore).toBeGreaterThanOrEqual(9.0);
  });
});
