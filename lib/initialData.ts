import { Subject, TopicProgress } from "./types";

export type StudyDuration = "0-3" | "3-6" | "6-12" | "12-24" | "24+";
export type DailyHours    = "1" | "2" | "3" | "4" | "6" | "8" | "10" | "12+";
export type StudySchedule = "daily" | "weekdays" | "weekends" | "irregular";

export interface OnboardingAnswers {
  studyDuration:  StudyDuration;
  dailyHours:     DailyHours;
  studySchedule:  StudySchedule;
  mockScores:     Record<string, number | null>;
  selfAssessment: Record<string, number>;
  weakTopicIds:   string[];
}

// ── 期間別ティアテーブル ──────────────────────────────
// proficiency: 全論点に一律で割り当てる習熟度（0-100）
// ランダム・分割なし → 全頂点が同じ値 → 正多角形
const DURATION_TIERS: Record<StudyDuration, { proficiency: number }> = {
  "0-3":   { proficiency: 14 },  // 3ヶ月未満
  "3-6":   { proficiency: 26 },  // 3〜6ヶ月
  "6-12":  { proficiency: 38 },  // 6ヶ月〜1年
  "12-24": { proficiency: 50 },  // 1〜2年
  "24+":   { proficiency: 60 },  // 2年以上
};

// 苦手科目ペナルティ（習熟度からの減点）
const WEAK_PENALTY = 22;

// ── 累計学習時間（UI表示用に残す） ───────────────────
const durationToMonths: Record<StudyDuration, number> = {
  "0-3": 2, "3-6": 4.5, "6-12": 9, "12-24": 18, "24+": 30,
};
const hoursToNum: Record<DailyHours, number> = {
  "1": 1, "2": 2, "3": 3, "4": 4, "6": 6, "8": 8, "10": 10, "12+": 13,
};
const scheduleRate: Record<StudySchedule, number> = {
  daily: 1.0, weekdays: 5/7, weekends: 2/7, irregular: 0.5,
};

export const calcTotalHours = (
  duration: StudyDuration,
  hours: DailyHours,
  schedule: StudySchedule,
): number => Math.round(
  durationToMonths[duration] * 30 * scheduleRate[schedule] * hoursToNum[hours]
);

// ── メイン：初期進捗データ生成 ───────────────────────
// 正多角形スタート：全科目・全論点で同一の習熟度値を使用。
// ランダム要素なし。苦手論点のみペナルティ適用。
export const generateInitialProgress = (
  subjects: Subject[],
  answers: OnboardingAnswers,
): Record<string, TopicProgress> => {
  const { studyDuration, weakTopicIds } = answers;
  const weakSet = new Set(weakTopicIds);
  const { proficiency: baseProficiency } = DURATION_TIERS[studyDuration];

  const result: Record<string, TopicProgress> = {};

  for (const subject of subjects) {
    for (const topic of subject.topics) {
      const isWeak = weakSet.has(topic.id);

      // 全論点・全科目に同じ値を割り当て（正多角形スタート）
      // 苦手論点のみペナルティで凹ませる
      const proficiency = Math.max(5, isWeak ? baseProficiency - WEAK_PENALTY : baseProficiency);
      const answered    = 5;
      const correct     = Math.round(proficiency / 100 * answered);

      result[topic.id] = {
        topicId:      topic.id,
        proficiency,
        correctCount: correct,
        wrongCount:   answered - correct,
        studyCount:   3,   // 全論点を「学習済み」扱い
        weakFlag:     isWeak,
        lastStudied:  new Date(Date.now() - 7 * 86400000).toISOString(),
      };
    }
  }

  return result;
};

// UI表示用：累計時間の目安
export const calcEstimatedHours = (
  duration: StudyDuration,
  hours: DailyHours,
  schedule: StudySchedule,
): number => calcTotalHours(duration, hours, schedule);

// UI表示用：期待習熟度%（全論点一律値）
export const calcExpectedCoverage = (
  duration: StudyDuration,
  _hours: DailyHours,
  _schedule: StudySchedule,
): number => DURATION_TIERS[duration].proficiency;
