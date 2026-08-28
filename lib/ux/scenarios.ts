export interface UXScenarioStep {
  stepNumber: number;
  title: string;
  userIntent: string; // ユーザーの心理・目的
  actionRequired: string; // アプリ上で取るべき行動
  targetItem: string; // 対象アイテム
  idealTapCount: number; // 理想的なタップ数
  actualTapCount: number; // 実装での必要タップ数
  cognitiveLoadScore: number; // 認知負荷スコア (10点満点、10が最もストレスフリー)
  evaluationHighlights: string[]; // 評価ポイント
}

export interface UXScenario {
  id: string;
  title: string;
  tag: string;
  persona: string;
  situation: string;
  goal: string;
  steps: UXScenarioStep[];
  overallUxScore: number; // 100点満点
  verdict: "EXCELLENT" | "GOOD" | "NEEDS_IMPROVEMENT";
  summary: string;
}

export const UX_SCENARIOS: UXScenario[] = [
  {
    id: "scenario-egg-bulk-buy",
    title: "シナリオ①: 週末の卵・まとめ買い登録",
    tag: "まとめ買い・登録UX",
    persona: "共働きで週末にまとめ買いをする親",
    situation: "スーパーから帰宅し、両手で荷物を片付けながら素早く卵1パックを登録したい。",
    goal: "「10個」という個数を手入力せず、1タップで1パック(10個)を直感的に買い足す。",
    steps: [
      {
        stepNumber: 1,
        title: "たまごの買い足しダイアログを開く",
        userIntent: "たまごカードのメニューから買い足しを選びたい",
        actionRequired: "メニュー(︙) ➔ 「買い足し」をクリック",
        targetItem: "たまご",
        idealTapCount: 2,
        actualTapCount: 2,
        cognitiveLoadScore: 9.5,
        evaluationHighlights: [
          "初期数量に package_quantity である「10個」が自動入力されている",
          "「1パック = 10個」と明記され、単位換算のストレスがゼロ",
        ],
      },
      {
        stepNumber: 2,
        title: "もし2パック買った場合のワンタップ切り替え",
        userIntent: "「20個」と打ち直さずに、2パックを選びたい",
        actionRequired: "「2パック (20個)」クイックボタンをクリック",
        targetItem: "たまご",
        idealTapCount: 1,
        actualTapCount: 1,
        cognitiveLoadScore: 10,
        evaluationHighlights: [
          "クイック選択ボタンによりキーボード入力が不要",
          "消費単位（1個）と購入単位（10個）が綺麗に調和",
        ],
      },
    ],
    overallUxScore: 98,
    verdict: "EXCELLENT",
    summary: "個数ベースの在庫管理を維持しながら、購入時のパック入力をワンタップで完了できる最高水準のUX。",
  },
  {
    id: "scenario-cabbage-fraction-consumption",
    title: "シナリオ②: 夕食作りの 1/4玉 端数消費",
    tag: "料理中のクイック消費",
    persona: "夕食の調理中にスマホでサッと在庫を記録したい人",
    situation: "料理中（手が少し濡れている）にお好み焼きでキャベツを1/4玉使用した。",
    goal: "キーボードや詳細画面を開かず、カード上の「-」を1回押すだけで0.25玉減算される。",
    steps: [
      {
        stepNumber: 1,
        title: "キャベツを 1/4玉 (0.25) 消費",
        userIntent: "「-」を1回タップして 0.75玉 ➔ 0.50玉 にしたい",
        actionRequired: "キャベツカードの「-」ボタンを1回クリック",
        targetItem: "キャベツ",
        idealTapCount: 1,
        actualTapCount: 1,
        cognitiveLoadScore: 10,
        evaluationHighlights: [
          "消費ステップ（0.25）が自動適用され、1タップで完了",
          "浮動小数点の丸め誤差がなく、正確に0.5玉と表示される",
          "最も古いロットから自動的に先入れ先出し（FIFO）で減算される",
        ],
      },
    ],
    overallUxScore: 100,
    verdict: "EXCELLENT",
    summary: "料理中の片手操作でも迷い・手間なく1タップで端数消費が完結する。",
  },
  {
    id: "scenario-oil-open-and-track",
    title: "シナリオ③: オリーブオイルの1本開封と長期日数管理",
    tag: "調味料・開封日トラッキング",
    persona: "調味料の鮮度や開封後経過を気にかける人",
    situation: "ストックしてあった2本のうち、1本を開封して使い始めた。",
    goal: "2本全体を開封済みにせず、1本だけ分離して開封日数を今日からカウントする。",
    steps: [
      {
        stepNumber: 1,
        title: "1本だけ開封する",
        userIntent: "「この1本だけ使い始める」と指示したい",
        actionRequired: "内訳を開いて「1本だけ開封する」をクリック",
        targetItem: "エキストラバージン オリーブオイル",
        idealTapCount: 2,
        actualTapCount: 2,
        cognitiveLoadScore: 9.5,
        evaluationHighlights: [
          "自動ロット分割により、未開封1本＋本日開封1本に綺麗に分離",
          "「開封後 1日目」とバッジが自動表示され、推奨目安（60日）と比較可能",
          "次回消費時、開封済みロットが最優先で自動消費される",
        ],
      },
    ],
    overallUxScore: 96,
    verdict: "EXCELLENT",
    summary: "ストックと使用中が自然に分かれ、賞味期限の長い調味料でも鮮度管理がストレスなく行える。",
  },
  {
    id: "scenario-food-waste-logging",
    title: "シナリオ④: フードロス（廃棄）の記録と改善",
    tag: "食品ロス削減・感情配慮UX",
    persona: "食材を無駄にしたくないが、うっかり傷ませてしまった人",
    situation: "冷蔵庫の整理中、使い切れずに傷んでしまったロットを発見した。",
    goal: "「食べた（消費）」と混同させず、ワンタップで「廃棄」として記録し、今後の買いすぎ防止に活かす。",
    steps: [
      {
        stepNumber: 1,
        title: "ロットの処理理由を選択",
        userIntent: "ゴミ箱アイコンではなく、適切に「廃棄した」と選びたい",
        actionRequired: "ロット設定アイコン ➔ 「廃棄した（フードロス）」を選択",
        targetItem: "任意のロット",
        idealTapCount: 2,
        actualTapCount: 2,
        cognitiveLoadScore: 9.0,
        evaluationHighlights: [
          "ゴミ箱アイコンの罪悪感を排し、前向きなデータ記録として提示",
          "「消費」「廃棄」「誤登録修正」の3択により、AIの購買サイクル予測精度が向上",
          "フードロス削減レポートの分析データとして蓄積",
        ],
      },
    ],
    overallUxScore: 95,
    verdict: "EXCELLENT",
    summary: "ユーザーの心理に配慮しながら、AI学習に不可欠な「消費 vs 廃棄」のデータを正確に分離収集できる。",
  },
];

/**
 * UX評価スコアの計算関数
 */
export function calculateScenarioUxScore(scenario: UXScenario) {
  const stepScores = scenario.steps.map((step) => {
    // タップ数のペナルティ (理想タップ数との差分)
    const tapPenalty = Math.max(0, (step.actualTapCount - step.idealTapCount) * 10);
    // 認知負荷スコア (10点満点を100点換算)
    const cognitiveScore = step.cognitiveLoadScore * 10;
    return Math.max(0, cognitiveScore - tapPenalty);
  });

  const avg = stepScores.reduce((sum, s) => sum + s, 0) / stepScores.length;
  return Math.round(avg);
}
