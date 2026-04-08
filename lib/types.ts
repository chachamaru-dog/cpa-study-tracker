export type ExamType = "short_may" | "short_dec" | "essay";

export interface ExamConfig {
  type: ExamType;
  label: string;
  examDate: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  weight: number; // 出題頻度の重み 1-5
}

export interface Subject {
  id: string;
  name: string;
  shortName: string; // レーダーチャート用
  maxScore: number;
  passingScore: number;
  topics: Topic[];
}

export interface TopicProgress {
  topicId: string;
  proficiency: number;  // 0-100 合格に紐づく習熟度（正答率ベース）
  correctCount: number;
  wrongCount: number;
  studyCount: number;   // 合計接触回数（coverage計算用）
  weakFlag: boolean;
  lastStudied: string;
}

export type StudyMethod =
  | "text_reading"    // テキスト精読
  | "audio_lecture"  // 音読・講義視聴
  | "summary_note"   // 要約・ノート作成
  | "practice"       // 問題演習
  | "past_exam"      // 過去問
  | "oral";          // 口頭説明・アウトプット

export const STUDY_METHOD_META: Record<StudyMethod, { label: string; type: "input" | "output"; icon: string }> = {
  text_reading:  { label: "テキスト精読", type: "input",  icon: "📖" },
  audio_lecture: { label: "音読・講義",   type: "input",  icon: "🎧" },
  summary_note:  { label: "要約ノート",   type: "input",  icon: "✍️" },
  practice:      { label: "問題演習",     type: "output", icon: "✏️" },
  past_exam:     { label: "過去問",       type: "output", icon: "📝" },
  oral:          { label: "口頭説明",     type: "output", icon: "🗣" },
};

export interface StudyRecord {
  id: string;
  topicId: string;
  subjectId: string;
  result: "correct" | "wrong" | "weak" | "neutral";
  method: StudyMethod;
  hours?: number;        // 学習時間（例: 1.5 = 1時間30分）
  concentration?: number; // 集中度 1〜5
  date: string;
  memo: string;
}

export interface AppState {
  examConfig: ExamConfig | null;
  topicProgress: Record<string, TopicProgress>;
  studyRecords: StudyRecord[];
}
