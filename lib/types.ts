export type ExamType = "short_may" | "short_dec" | "essay" | "boki1" | "boki2" | "boki3";

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
  selfConfident?: boolean; // 「忘れない自信ある」フラグ（忘却曲線の減衰を遅らせる）
}

export type StudyMethod =
  | "text_reading"    // テキスト精読
  | "audio_lecture"  // 音読・講義視聴
  | "summary_note"   // 要約・ノート作成
  | "practice"       // 問題演習
  | "past_exam"      // 過去問
  | "oral";          // 口頭説明・アウトプット

export const STUDY_METHOD_META: Record<StudyMethod, { label: string; type: "input" | "output" }> = {
  text_reading:  { label: "テキスト精読", type: "input"  },
  audio_lecture: { label: "音読・講義",   type: "input"  },
  summary_note:  { label: "要約ノート",   type: "input"  },
  practice:      { label: "問題演習",     type: "output" },
  past_exam:     { label: "過去問",       type: "output" },
  oral:          { label: "口頭説明",     type: "output" },
};

export interface Textbook {
  id: string;
  name: string;
  totalPages: number;
}

export interface StudyRecord {
  id: string;
  topicId: string;
  subjectId: string;
  result: "correct" | "wrong" | "weak" | "neutral";
  method: StudyMethod;
  hours?: number;          // 学習時間（例: 1.5 = 1時間30分）
  concentration?: number;  // 集中度 1〜5
  understanding?: number;  // 自己評価理解度 0-100（NaturalInput用）
  coveragePct?: number;    // この論点の何%をカバーしたか 0-100
  isReview?: boolean;      // 復習か新規か
  rangeNote?: string;      // 範囲メモ（例: "問1-10" "p.5-20"）
  textbookId?: string;     // 使用したテキストID
  pageFrom?: number;       // 学習開始ページ
  pageTo?: number;         // 学習終了ページ
  date: string;
  memo: string;
}

export interface MockExamRecord {
  id: string;
  type: "touren" | "moshi" | "honshiken";
  date: string;
  scores: Record<string, number>;  // subjectId → 取得点
  pcts:   Record<string, number>;  // subjectId → 得点率 0-100
}

export interface CustomTodo {
  id: string;
  text: string;
}

export interface CustomTopic {
  id: string;
  subjectId: string;
  name: string;
  weight: number;
}

export interface StudyReminder {
  id: string;
  topicId: string;
  topicName: string;
  subjectName: string;
  scheduledAt: string; // ISO 8601
}

export interface AppState {
  examConfig: ExamConfig | null;
  topicProgress: Record<string, TopicProgress>;
  studyRecords: StudyRecord[];
  mockExamRecords: MockExamRecord[];
  textbooks: Textbook[];
  topicNameOverrides: Record<string, string>; // topicId → カスタム表示名
  customTopics: CustomTopic[];                // ユーザーが追加した論点
  customTodos: CustomTodo[];                  // ユーザーが追加したTODO
  reminders: StudyReminder[];                 // 復習リマインダー
}
