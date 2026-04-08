import { AppState, StudyMethod, STUDY_METHOD_META } from "./types";
import { Subject } from "./types";
import { calcMasteryScore, calcCoverageScore } from "./storage";

// エビングハウス忘却曲線: retention = e^(-days / stability)
// stability は復習回数で増加
const calcRetention = (daysSince: number, reviewCount: number): number => {
  const stability = Math.max(1, reviewCount * 3 + 2); // 復習するほど記憶が安定
  return Math.round(100 * Math.exp(-daysSince / stability));
};

const daysSince = (dateStr: string): number => {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
};

export interface ReviewAlert {
  topicId: string;
  topicName: string;
  subjectName: string;
  daysSince: number;
  retention: number;
  urgency: "critical" | "warning";
  reason: string;
}

export interface Task {
  id: string;
  topicId: string;
  topicName: string;
  subjectName: string;
  priority: "high" | "medium" | "low";
  reason: string;
  icon: string;
}

// 忘却曲線に基づく復習アラート
export const getReviewAlerts = (
  subjects: Subject[],
  state: AppState
): ReviewAlert[] => {
  const alerts: ReviewAlert[] = [];

  for (const subject of subjects) {
    for (const topic of subject.topics) {
      const progress = state.topicProgress[topic.id];
      if (!progress || progress.studyCount === 0) continue;

      const days = daysSince(progress.lastStudied);
      const retention = calcRetention(days, progress.studyCount);

      if (days >= 7) {
        alerts.push({
          topicId: topic.id,
          topicName: topic.name,
          subjectName: subject.name,
          daysSince: days,
          retention,
          urgency: days >= 14 ? "critical" : "warning",
          reason: days >= 14
            ? `${days}日間未復習`
            : `${days}日ぶり — そろそろ復習を`,
        });
      }
    }
  }

  return alerts.sort((a, b) => a.retention - b.retention);
};

// 今日やるべきタスク生成（1優先 + 1推奨 の計2件）
export const generateTodayTasks = (
  subjects: Subject[],
  state: AppState
): Task[] => {
  const alerts = getReviewAlerts(subjects, state);
  const highCandidates: Task[] = [];
  const mediumCandidates: Task[] = [];

  // 忘却危機 → 優先
  for (const a of alerts.filter((a) => a.urgency === "critical")) {
    highCandidates.push({
      id: `review_${a.topicId}`,
      topicId: a.topicId,
      topicName: a.topicName,
      subjectName: a.subjectName,
      priority: "high",
      reason: a.reason,
      icon: "🔴",
    });
  }

  // 苦手フラグ → 優先
  for (const subject of subjects) {
    for (const topic of subject.topics) {
      const progress = state.topicProgress[topic.id];
      if (!progress?.weakFlag) continue;
      const days = daysSince(progress.lastStudied);
      if (days < 3) continue;
      if (highCandidates.some((t) => t.topicId === topic.id)) continue;
      highCandidates.push({
        id: `weak_${topic.id}`,
        topicId: topic.id,
        topicName: topic.name,
        subjectName: subject.name,
        priority: "high",
        reason: `苦手フラグあり・${days}日未着手`,
        icon: "⚠️",
      });
    }
  }

  // 復習警告 → 推奨
  for (const a of alerts.filter((a) => a.urgency === "warning")) {
    mediumCandidates.push({
      id: `review_w_${a.topicId}`,
      topicId: a.topicId,
      topicName: a.topicName,
      subjectName: a.subjectName,
      priority: "medium",
      reason: a.reason,
      icon: "🟡",
    });
  }

  // 重要度高くて未着手 → 推奨
  for (const subject of subjects) {
    for (const topic of subject.topics) {
      if (topic.weight < 4) continue;
      const progress = state.topicProgress[topic.id];
      if (progress && progress.studyCount > 0) continue;
      if (mediumCandidates.some((t) => t.topicId === topic.id)) continue;
      mediumCandidates.push({
        id: `new_${topic.id}`,
        topicId: topic.id,
        topicName: topic.name,
        subjectName: subject.name,
        priority: "medium",
        reason: `重要度★${topic.weight} — まだ未着手`,
        icon: "📚",
      });
    }
  }

  const result: Task[] = [];
  if (highCandidates.length > 0) result.push(highCandidates[0]);
  if (mediumCandidates.length > 0) result.push(mediumCandidates[0]);
  return result;
};

// 今週やるべきタスク生成
export const generateWeekTasks = (
  subjects: Subject[],
  state: AppState
): Task[] => {
  const tasks: Task[] = [];
  const todayIds = new Set(generateTodayTasks(subjects, state).map((t) => t.topicId));
  const alerts = getReviewAlerts(subjects, state);

  // 警告レベルの復習
  alerts
    .filter((a) => a.urgency === "warning" && !todayIds.has(a.topicId))
    .slice(0, 4)
    .forEach((a) => {
      tasks.push({
        id: `review_week_${a.topicId}`,
        topicId: a.topicId,
        topicName: a.topicName,
        subjectName: a.subjectName,
        priority: "medium",
        reason: a.reason,
        icon: "🟡",
      });
    });

  // カバレッジの低い科目の未着手論点
  const subjectCoverages = subjects.map((s) => ({
    subject: s,
    coverage: calcCoverageScore(state.topicProgress, s.topics),
  }));
  subjectCoverages.sort((a, b) => a.coverage - b.coverage);

  for (const { subject } of subjectCoverages.slice(0, 2)) {
    const unstudied = subject.topics
      .filter((t) => !(state.topicProgress[t.id]?.studyCount > 0))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 2);

    for (const topic of unstudied) {
      if (todayIds.has(topic.id) || tasks.some((t) => t.topicId === topic.id)) continue;
      tasks.push({
        id: `week_new_${topic.id}`,
        topicId: topic.id,
        topicName: topic.name,
        subjectName: subject.name,
        priority: "low",
        reason: `${subject.name}のカバー率が低い`,
        icon: "📖",
      });
    }
  }

  return tasks.slice(0, 6);
};

// 一言コメント生成
export const generateInsightComment = (
  subjects: Subject[],
  state: AppState
): string => {
  const { topicProgress } = state;

  const weakTopics = subjects.flatMap((s) =>
    s.topics.filter((t) => topicProgress[t.id]?.weakFlag)
  );
  const alerts = getReviewAlerts(subjects, state);
  const criticals = alerts.filter((a) => a.urgency === "critical");

  const subjectScores = subjects.map((s) => ({
    name: s.shortName,
    mastery: calcMasteryScore(topicProgress, s.topics),
    coverage: calcCoverageScore(topicProgress, s.topics),
  }));

  const lowestMastery = subjectScores.reduce((min, s) =>
    s.mastery < min.mastery ? s : min, subjectScores[0]);
  const lowestCoverage = subjectScores.reduce((min, s) =>
    s.coverage < min.coverage ? s : min, subjectScores[0]);
  const highestMastery = subjectScores.reduce((max, s) =>
    s.mastery > max.mastery ? s : max, subjectScores[0]);

  // 状況に応じたコメント
  if (criticals.length >= 3) {
    return `${criticals[0].topicName}など${criticals.length}論点が忘却危機です。今日は復習を優先しましょう。`;
  }
  if (weakTopics.length >= 5) {
    return `苦手論点が${weakTopics.length}個あります。まず集中して${weakTopics[0].name}から潰していきましょう。`;
  }
  if (lowestCoverage.coverage < 20) {
    return `${lowestCoverage.name}の学習範囲がまだ${lowestCoverage.coverage}%です。手つかずの論点が多く残っています。`;
  }
  if (lowestMastery.mastery < 30 && lowestCoverage.coverage > 40) {
    return `${lowestMastery.name}はある程度学習しましたが習熟度${lowestMastery.mastery}%と低めです。問題演習を増やしましょう。`;
  }
  if (highestMastery.mastery >= 70) {
    return `${highestMastery.name}は習熟度${highestMastery.mastery}%と好調です。他の科目も同じペースで進めましょう。`;
  }

  const totalRecords = state.studyRecords.length;
  if (totalRecords === 0) {
    return "まだ学習記録がありません。今日から記録を始めましょう！";
  }
  return "コツコツと学習が続いています。このペースを維持しましょう。";
};

// インプット/アウトプット比率の計算（直近30日、時間×集中度で重み付け）
export const calcIORate = (
  state: AppState
): { inputCount: number; outputCount: number; inputRate: number; outputRate: number; byMethod: Record<StudyMethod, number>; totalHours: number } => {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = state.studyRecords.filter((r) => new Date(r.date).getTime() > cutoff);

  const byMethod: Record<string, number> = {};
  let inputWeight = 0;
  let outputWeight = 0;
  let totalHours = 0;

  for (const record of recent) {
    const method = record.method ?? "practice";
    // 時間 × 集中度（1-5）で重み付け。未入力時は1h×3/5=0.6
    const weight = (record.hours ?? 1) * ((record.concentration ?? 3) / 5);
    byMethod[method] = (byMethod[method] ?? 0) + weight;
    const meta = STUDY_METHOD_META[method as StudyMethod];
    if (meta?.type === "input") inputWeight += weight;
    else outputWeight += weight;
    totalHours += record.hours ?? 0;
  }

  const total = inputWeight + outputWeight;
  return {
    inputCount: Math.round(inputWeight * 10) / 10,
    outputCount: Math.round(outputWeight * 10) / 10,
    inputRate: total > 0 ? Math.round((inputWeight / total) * 100) : 0,
    outputRate: total > 0 ? Math.round((outputWeight / total) * 100) : 0,
    byMethod: byMethod as Record<StudyMethod, number>,
    totalHours,
  };
};

// 直近N日の平均集中度（1-5）
export const calcAvgConcentration = (state: AppState, days = 7): number | null => {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = state.studyRecords.filter(
    (r) => new Date(r.date).getTime() > cutoff && r.concentration != null
  );
  if (recent.length === 0) return null;
  const sum = recent.reduce((s, r) => s + (r.concentration ?? 3), 0);
  return Math.round((sum / recent.length) * 10) / 10;
};

// 全期間の合計学習時間（studyRecords から）
export const calcTotalStudyHours = (state: AppState): number => {
  return Math.round(
    state.studyRecords.reduce((s, r) => s + (r.hours ?? 0), 0) * 10
  ) / 10;
};
