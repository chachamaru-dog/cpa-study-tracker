import { AppState, StudyMethod, StudyRecord, TopicProgress } from "./types";

const STORAGE_KEY = "cpa_study_tracker";

export const defaultState: AppState = {
  examConfig: null,
  topicProgress: {},
  studyRecords: [],
};

export const loadState = (): AppState => {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return JSON.parse(raw) as AppState;
  } catch {
    return defaultState;
  }
};

export const saveState = (state: AppState): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

// ─── 確信度ブレンド ─────────────────────────────────────────
// studyCountが少ないうちは50%スタートで、データが積み重なるほど実値へ
const INITIAL_PROFICIENCY = 50;
const CONFIDENCE_THRESHOLD = 30; // この回数を超えると実値を信頼

export const calcConfidence = (studyCount: number): number =>
  Math.min(1, studyCount / CONFIDENCE_THRESHOLD);

// 表示用の習熟度（50%から実値へ段階的に移行）
export const calcDisplayProficiency = (proficiency: number, studyCount: number): number => {
  const confidence = calcConfidence(studyCount);
  return Math.round(INITIAL_PROFICIENCY * (1 - confidence) + proficiency * confidence);
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

// ─── 科目の習熟度スコア（表示用ブレンド適用済み） ─────────
export const calcMasteryScore = (
  topicProgress: Record<string, TopicProgress>,
  topics: { id: string; weight: number }[]
): number => {
  if (topics.length === 0) return 0;
  const totalWeight = topics.reduce((sum, t) => sum + t.weight, 0);
  const weighted = topics.reduce((sum, t) => {
    const p = topicProgress[t.id];
    const display = p
      ? calcDisplayProficiency(p.proficiency, p.studyCount)
      : INITIAL_PROFICIENCY;
    return sum + display * t.weight;
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

// ─── 合格可能性（厳しめ設定） ────────────────────────────────
// 短答式は全科目70%以上かつ各科目40%以上が必要
// 習熟度75%でようやく合格可能性50%程度になる設計
export const calcPassProbability = (
  topicProgress: Record<string, TopicProgress>,
  subjects: { id: string; maxScore: number; topics: { id: string; weight: number }[] }[]
): number => {
  if (subjects.length === 0) return 0;

  const scores = subjects.map((s) => calcMasteryScore(topicProgress, s.topics));
  const totalMaxScore = subjects.reduce((sum, s) => sum + s.maxScore, 0);

  // 配点加重平均
  const weightedAvg = subjects.reduce((sum, s, i) => {
    return sum + scores[i] * (s.maxScore / totalMaxScore);
  }, 0);

  const minScore = Math.min(...scores);

  // シグモイド関数ベース：75%習熟度 → 50%合格確率
  // f(x) = 100 / (1 + e^(-(x - 75) / 6))
  const sigmoid = (x: number) => 100 / (1 + Math.exp(-(x - 75) / 6));
  let prob = sigmoid(weightedAvg);

  // 科目別最低基準ペナルティ（40%以下の科目があると大幅減）
  if (minScore < 40) {
    prob *= 0.25; // 足切りリスク大
  } else if (minScore < 55) {
    prob *= 0.6;  // 足切りリスク中
  } else if (minScore < 65) {
    prob *= 0.85;
  }

  // 全科目均等でないとペナルティ
  const variance = scores.reduce((sum, s) => sum + (s - weightedAvg) ** 2, 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev > 15) prob *= 0.9; // ばらつきが大きいとさらに厳しく

  return Math.max(0, Math.min(99, Math.round(prob)));
};
