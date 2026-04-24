import { AppState, MockExamRecord, StudyMethod, StudyRecord, Textbook, TopicProgress } from "./types";

const STORAGE_KEY = "cpa_study_tracker";

export const defaultState: AppState = {
  examConfig: null,
  topicProgress: {},
  studyRecords: [],
  mockExamRecords: [],
  textbooks: [],
  topicNameOverrides: {},
  customTopics: [],
  customTodos: [],
  reminders: [],
};

export const loadState = (): AppState => {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as AppState;
    return {
      ...defaultState,
      ...parsed,
      textbooks:          parsed.textbooks          ?? [],
      topicNameOverrides: parsed.topicNameOverrides ?? {},
      customTopics:       parsed.customTopics       ?? [],
      customTodos:        parsed.customTodos        ?? [],
      reminders:          parsed.reminders          ?? [],
    };
  } catch {
    return defaultState;
  }
};

export const saveState = (state: AppState): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

// 後方互換のためエクスポートは残すが、ブレンドなしで実値をそのまま返す
export const calcConfidence = (_studyCount: number): number => 1;
export const calcDisplayProficiency = (proficiency: number, _studyCount: number): number => proficiency;

// ─── 忘却曲線による習熟度の時間減衰 ─────────────────────
// ForgettingCurveScreen と同じ安定度計算式
// stability = studyCount×3+2（自信ありなら×2）
// decayed = proficiency × exp(-daysSince / stability)
const INITIAL_PROFICIENCY = 0;
export const calcDecayedProficiency = (progress: TopicProgress): number => {
  if (!progress || progress.studyCount === 0) return INITIAL_PROFICIENCY;
  const stability = Math.max(1, progress.studyCount * 3 + 2) * (progress.selfConfident ? 2 : 1);
  const daysSince = (Date.now() - new Date(progress.lastStudied).getTime()) / 86400000;
  const decayed = Math.round(progress.proficiency * Math.exp(-daysSince / stability));
  return Math.max(0, decayed);
};

// ─── 更新 ───────────────────────────────────────────────────
export const updateTopicProgress = (
  state: AppState,
  topicId: string,
  result: "correct" | "wrong" | "weak" | "neutral",
  method: StudyMethod = "practice",
  hours: number = 1,
  concentration: number = 3
): AppState => {
  const prev: TopicProgress = state.topicProgress[topicId] ?? {
    topicId,
    proficiency: 50,
    correctCount: 0,
    wrongCount: 0,
    studyCount: 0,
    weakFlag: false,
    lastStudied: new Date().toISOString(),
  };

  const updated: TopicProgress = {
    ...prev,
    correctCount: result === "correct" ? prev.correctCount + 1 : prev.correctCount,
    wrongCount:   result === "wrong"   ? prev.wrongCount + 1   : prev.wrongCount,
    studyCount:   prev.studyCount + 1,
    weakFlag:     result === "weak" ? true : prev.weakFlag,
    lastStudied:  new Date().toISOString(),
  };

  if (result === "correct" || result === "wrong") {
    const total = updated.correctCount + updated.wrongCount;
    const baseScore = total > 0 ? (updated.correctCount / total) * 100 : 50;
    const weakPenalty = updated.weakFlag ? 10 : 0;
    updated.proficiency = Math.max(0, Math.round(baseScore - weakPenalty));
  } else if (result === "weak") {
    updated.proficiency = Math.max(0, prev.proficiency - 10);
  }

  const record: StudyRecord = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    topicId,
    subjectId: topicId,
    result,
    method,
    hours,
    concentration,
    date: new Date().toISOString(),
    memo: "",
  };

  return {
    ...state,
    topicProgress: { ...state.topicProgress, [topicId]: updated },
    studyRecords: [record, ...state.studyRecords],
  };
};

// ─── NaturalInput用：理解度をEMAで習熟度に反映 ────────────
// 初回 → 理解度をそのまま設定
// 2回目以降 → 旧値×0.6 + 新値×0.4 でなだらかに更新
export const touchTopicProgress = (
  state: AppState,
  topicId: string,
  understanding?: number,
): AppState => {
  const prev: TopicProgress = state.topicProgress[topicId] ?? {
    topicId,
    proficiency: 0,
    correctCount: 0,
    wrongCount: 0,
    studyCount: 0,
    weakFlag: false,
    lastStudied: new Date().toISOString(),
  };

  let newProficiency = prev.proficiency;
  if (understanding !== undefined) {
    if (prev.studyCount === 0) {
      // 初回は直接セット
      newProficiency = understanding;
    } else {
      // EMA α=0.5：忘却で減衰した現在値をベースに更新
      const decayedBase = calcDecayedProficiency(prev);
      newProficiency = Math.round(decayedBase * 0.5 + understanding * 0.5);
    }
  }

  return {
    ...state,
    topicProgress: {
      ...state.topicProgress,
      [topicId]: {
        ...prev,
        studyCount:  prev.studyCount + 1,
        lastStudied: new Date().toISOString(),
        proficiency: newProficiency,
      },
    },
  };
};

// ─── 論点の累計カバレッジ推定 ────────────────────────────
// ① テキスト+ページ範囲の記録がある → ページ和集合で正確に計算
// ② ない場合 → coveragePctの確率的合算（重複考慮）
// ③ どちらもない → 100%（後方互換）
export const calcCumulativeCoverage = (
  topicId: string,
  studyRecords: StudyRecord[],
  textbooks: Textbook[] = []
): number => {
  const topicRecs = studyRecords.filter(r => r.topicId === topicId);

  // ① ページ範囲記録があるテキストをまとめて計算
  const tbIds = [...new Set(
    topicRecs.filter(r => r.textbookId && r.pageFrom != null && r.pageTo != null)
             .map(r => r.textbookId!)
  )];

  if (tbIds.length > 0) {
    let totalCovered = 0;
    let totalPages   = 0;
    for (const tbId of tbIds) {
      const tb = textbooks.find(t => t.id === tbId);
      if (!tb) continue;
      // ページ範囲の和集合
      const ranges = topicRecs
        .filter(r => r.textbookId === tbId && r.pageFrom != null && r.pageTo != null)
        .map(r => [r.pageFrom!, r.pageTo!] as [number, number])
        .sort((a, b) => a[0] - b[0]);
      let covered = 0;
      let [cs, ce] = ranges[0];
      for (let i = 1; i < ranges.length; i++) {
        const [s, e] = ranges[i];
        if (s <= ce + 1) { ce = Math.max(ce, e); }
        else { covered += ce - cs + 1; [cs, ce] = [s, e]; }
      }
      covered += ce - cs + 1;
      totalCovered += Math.min(covered, tb.totalPages);
      totalPages   += tb.totalPages;
    }
    if (totalPages > 0) return Math.min(1, totalCovered / totalPages);
  }

  // ② coveragePctのみの場合 → 確率的合算
  const pctRecs = topicRecs.filter(r => r.coveragePct != null);
  if (pctRecs.length === 0) return 1; // 記録なし → 100%とみなす
  const remaining = pctRecs.reduce((acc, r) => acc * (1 - r.coveragePct! / 100), 1);
  return Math.min(1, 1 - remaining);
};

// ─── 実効習熟度 = 忘却減衰済み習熟度 × 累計カバレッジ ──
export const calcEffectiveProficiency = (
  progress: TopicProgress,
  studyRecords: StudyRecord[],
  textbooks: Textbook[] = []
): number => {
  const decayed  = calcDecayedProficiency(progress);
  const coverage = calcCumulativeCoverage(progress.topicId, studyRecords, textbooks);
  return Math.round(decayed * coverage);
};

// ─── 科目の習熟度スコア（学習済み論点のみ） ─────────────
// 未学習論点は分母に含めない（記録したものだけで評価）
export const calcMasteryScore = (
  topicProgress: Record<string, TopicProgress>,
  topics: { id: string; weight: number }[],
  studyRecords: StudyRecord[] = [],
  textbooks: Textbook[] = []
): number => {
  const studied = topics.filter(t => (topicProgress[t.id]?.studyCount ?? 0) > 0);
  if (studied.length === 0) return 0;
  const totalWeight = studied.reduce((sum, t) => sum + t.weight, 0);
  const weighted    = studied.reduce((sum, t) => {
    const p = topicProgress[t.id];
    return sum + (p ? calcEffectiveProficiency(p, studyRecords, textbooks) : 0) * t.weight;
  }, 0);
  return Math.round(weighted / totalWeight);
};

// ─── カバレッジ（接触した論点の割合） ───────────────────────
export const calcCoverageScore = (
  topicProgress: Record<string, TopicProgress>,
  topics: { id: string }[]
): number => {
  if (topics.length === 0) return 0;
  const studied = topics.filter((t) => (topicProgress[t.id]?.studyCount ?? 0) > 0).length;
  return Math.round((studied / topics.length) * 100);
};

// ─── 合格可能性 ───────────────────────────────────────────────
// 3つのシグナルをブレンド：
//   ① 習熟度ベース（記録が積み上がるほど信頼度UP）
//   ② 累計学習時間（消極的な下支え）
//   ③ 模試・答練得点（最も信頼性が高い）
//
// 公認会計士試験は相対評価のため:
//   習熟度 72% ≈ 50%合格可能性、80% ≈ 73%
//   模試平均 65% ≈ 50%合格可能性、70% ≈ 65%
export const calcPassProbability = (
  topicProgress: Record<string, TopicProgress>,
  subjects: { id: string; maxScore: number; topics: { id: string; weight: number }[] }[],
  studyRecords: StudyRecord[] = [],
  mockExamRecords: MockExamRecord[] = [],
  textbooks: Textbook[] = [],
): number => {
  if (subjects.length === 0) return 0;

  const scores      = subjects.map((s) => calcMasteryScore(topicProgress, s.topics, studyRecords, textbooks));
  const totalMaxScore = subjects.reduce((sum, s) => sum + s.maxScore, 0);
  const weightedAvg = subjects.reduce((sum, s, i) => sum + scores[i] * (s.maxScore / totalMaxScore), 0);
  const minScore    = Math.min(...scores);

  // ① 習熟度シグモイド（center=72, width=8）
  //    習熟度80%→73%、72%→50%、60%→23%
  const masteryProb = 100 / (1 + Math.exp(-(weightedAvg - 72) / 8));

  // ② 学習時間による下支え（消極的、上限25%）
  //    1000h → 18%、2000h → 23%
  const totalHours = studyRecords.reduce((s, r) => s + (r.hours ?? 0), 0);
  const hoursPrior = 25 * (1 - Math.exp(-totalHours / 800));

  // ③ 模試・答練スコア（直近3件の加重平均、center=65, width=8）
  //    70%得点 → 65%合格可能性、65%得点 → 50%
  let mockSignal: number | null = null;
  if (mockExamRecords.length > 0) {
    const recent = [...mockExamRecords]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);
    const allPcts = recent.flatMap(r => Object.values(r.pcts));
    if (allPcts.length > 0) {
      const avgPct = allPcts.reduce((s, v) => s + v, 0) / allPcts.length;
      mockSignal = 100 / (1 + Math.exp(-(avgPct - 65) / 8));
    }
  }

  // ブレンド（模試あり：習熟度40% + 時間20% + 模試40%）
  let baseProb: number;
  if (mockSignal !== null) {
    baseProb = 0.40 * masteryProb + 0.20 * hoursPrior + 0.40 * mockSignal;
  } else {
    baseProb = 0.60 * masteryProb + 0.40 * hoursPrior;
  }

  // 足切りペナルティ（最低科目が極端に低い場合）
  if      (minScore < 40) baseProb *= 0.30;
  else if (minScore < 55) baseProb *= 0.65;
  else if (minScore < 65) baseProb *= 0.85;

  // ばらつきペナルティ
  const variance = scores.reduce((sum, s) => sum + (s - weightedAvg) ** 2, 0) / scores.length;
  if (Math.sqrt(variance) > 15) baseProb *= 0.90;

  return Math.max(0, Math.min(99, Math.round(baseProb)));
};
