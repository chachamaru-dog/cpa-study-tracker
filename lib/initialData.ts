import { Subject, TopicProgress } from "./types";

export type StudyDuration = "0-3" | "3-6" | "6-12" | "12-24" | "24+";
export type DailyHours    = "1" | "2" | "3" | "4" | "6" | "8" | "10" | "12+";
export type StudySchedule = "daily" | "weekdays" | "weekends" | "irregular";

export interface OnboardingAnswers {
  mockScores:     Record<string, number | null>;
  selfAssessment: Record<string, number>;
  weakTopicIds:   string[];
}


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
// 全論点ゼロスタート。記録を積むほど正確になっていく。
export const generateInitialProgress = (
  subjects: Subject[],
  answers: OnboardingAnswers,
): Record<string, TopicProgress> => {
  const weakSet = new Set(answers.weakTopicIds);
  const result: Record<string, TopicProgress> = {};

  for (const subject of subjects) {
    for (const topic of subject.topics) {
      result[topic.id] = {
        topicId:      topic.id,
        proficiency:  0,
        correctCount: 0,
        wrongCount:   0,
        studyCount:   0,
        weakFlag:     weakSet.has(topic.id),
        lastStudied:  new Date().toISOString(),
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

// UI表示用（後方互換）
export const calcExpectedCoverage = (
  _duration: StudyDuration,
  _hours: DailyHours,
  _schedule: StudySchedule,
): number => 0;
