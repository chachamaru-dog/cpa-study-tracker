"use client";

import { useState } from "react";
import { Subject } from "@/lib/types";
import {
  OnboardingAnswers,
  StudyDuration,
  DailyHours,
  StudySchedule,
  calcEstimatedHours,
  calcExpectedCoverage,
} from "@/lib/initialData";

interface Props {
  subjects: Subject[];
  onComplete: (answers: OnboardingAnswers) => void;
  previewMode?: boolean; // trueのとき最後に保存せず閉じるだけ
  onClose?: () => void;  // previewMode時の戻り先
}

const DURATION_OPTIONS: { value: StudyDuration; label: string; sub: string }[] = [
  { value: "0-3",   label: "3ヶ月未満",    sub: "最近始めた" },
  { value: "3-6",   label: "3〜6ヶ月",     sub: "基礎固め中" },
  { value: "6-12",  label: "6ヶ月〜1年",   sub: "一通り学習済み" },
  { value: "12-24", label: "1〜2年",        sub: "応用段階" },
  { value: "24+",   label: "2年以上",       sub: "長期受験生" },
];

const HOURS_OPTIONS: { value: DailyHours; label: string; note?: string }[] = [
  { value: "1",   label: "1時間程度" },
  { value: "2",   label: "2時間程度" },
  { value: "3",   label: "3時間程度" },
  { value: "4",   label: "4時間程度" },
  { value: "6",   label: "6時間程度" },
  { value: "8",   label: "8時間程度",   note: "専念" },
  { value: "10",  label: "10時間程度",  note: "専念" },
  { value: "12+", label: "12時間以上",  note: "直前期" },
];

const SCHEDULE_OPTIONS: { value: StudySchedule; label: string; icon: string }[] = [
  { value: "daily",     label: "毎日",       icon: "🔥" },
  { value: "weekdays",  label: "平日のみ",   icon: "📅" },
  { value: "weekends",  label: "休日中心",   icon: "🏖" },
  { value: "irregular", label: "不規則",     icon: "🎲" },
];

const SELF_LEVELS = [
  { value: 1, label: "全然ダメ", icon: "😰", color: "border-red-500 bg-red-500/10 text-red-300" },
  { value: 2, label: "苦手",     icon: "😟", color: "border-orange-500 bg-orange-500/10 text-orange-300" },
  { value: 3, label: "普通",     icon: "😐", color: "border-yellow-500 bg-yellow-500/10 text-yellow-300" },
  { value: 4, label: "得意",     icon: "🙂", color: "border-green-500 bg-green-500/10 text-green-300" },
  { value: 5, label: "自信あり", icon: "😊", color: "border-blue-500 bg-blue-500/10 text-blue-300" },
];


export default function OnboardingQuiz({ subjects, onComplete, previewMode = false, onClose }: Props) {
  const [step, setStep] = useState(0);

  // Step 0: 学習背景
  const [studyDuration, setStudyDuration] = useState<StudyDuration | null>(null);
  const [dailyHours, setDailyHours] = useState<DailyHours | null>(null);
  const [studySchedule, setStudySchedule] = useState<StudySchedule | null>(null);

  // Step 1: 答練有無
  const [hasMockScore, setHasMockScore] = useState<boolean | null>(null);

  // Step 2: 点数
  const [mockScores, setMockScores] = useState<Record<string, string>>({});

  // Step 3: 自己評価
  const [selfAssessment, setSelfAssessment] = useState<Record<string, number>>({});

  // Step 4: 苦手論点
  const [weakTopicIds, setWeakTopicIds] = useState<Set<string>>(new Set());
  const [selectedSubjectForWeak, setSelectedSubjectForWeak] = useState(subjects[0].id);

  const totalSteps = 5;

  const estimatedHours =
    studyDuration && dailyHours && studySchedule
      ? calcEstimatedHours(studyDuration, dailyHours, studySchedule)
      : null;

  const expectedCoverage =
    studyDuration && dailyHours && studySchedule
      ? calcExpectedCoverage(studyDuration, dailyHours, studySchedule)
      : null;

  const handleComplete = () => {
    const parsedMock: Record<string, number | null> = {};
    for (const s of subjects) {
      const v = mockScores[s.id];
      parsedMock[s.id] = hasMockScore && v && !isNaN(Number(v)) ? Number(v) : null;
    }
    const parsedSelf: Record<string, number> = {};
    for (const s of subjects) {
      parsedSelf[s.id] = selfAssessment[s.id] ?? 3;
    }
    onComplete({
      studyDuration: studyDuration!,
      dailyHours: dailyHours!,
      studySchedule: studySchedule!,
      mockScores: parsedMock,
      selfAssessment: parsedSelf,
      weakTopicIds: [...weakTopicIds],
    });
  };

  const activeSubject = subjects.find((s) => s.id === selectedSubjectForWeak)!;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col p-4 max-w-lg mx-auto">
      {/* プレビューモードバナー */}
      {previewMode && (
        <div className="flex items-center justify-between bg-yellow-950/70 border border-yellow-700 rounded-xl px-4 py-2.5 mb-4 mt-2">
          <div className="flex items-center gap-2 text-sm text-yellow-300">
            <span>👁</span>
            <span className="font-semibold">プレビューモード</span>
            <span className="text-yellow-500 text-xs">— データは保存されません</span>
          </div>
          <button onClick={onClose} className="text-yellow-500 hover:text-yellow-300 text-sm">閉じる ✕</button>
        </div>
      )}

      {/* プログレスバー */}
      <div className="pt-4 mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>初期設定</span>
          <span>{step + 1} / {totalSteps}</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* ─── Step 0: 学習背景 ─── */}
      {step === 0 && (
        <div className="flex-1 flex flex-col">
          <h2 className="text-xl font-bold mb-1">学習の状況を教えてください</h2>
          <p className="text-gray-400 text-sm mb-5">
            初期の習熟度データをより正確に設定するために使います。
          </p>

          {/* 学習期間 */}
          <div className="mb-5">
            <div className="text-sm font-semibold text-gray-300 mb-2">📅 会計士試験の学習を始めてどのくらいですか？</div>
            <div className="space-y-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStudyDuration(opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex justify-between items-center ${
                    studyDuration === opt.value
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-gray-700 bg-gray-900 hover:border-gray-600"
                  }`}
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-sm text-gray-400">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 1日の学習時間 */}
          <div className="mb-5">
            <div className="text-sm font-semibold text-gray-300 mb-2">⏱ 1日の平均学習時間は？</div>
            <div className="grid grid-cols-2 gap-2">
              {HOURS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDailyHours(opt.value)}
                  className={`py-2.5 rounded-xl border-2 font-medium transition-all flex flex-col items-center leading-tight ${
                    dailyHours === opt.value
                      ? "border-blue-500 bg-blue-500/10 text-white"
                      : "border-gray-700 bg-gray-900 text-gray-400"
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.note && (
                    <span className={`text-xs mt-0.5 ${
                      dailyHours === opt.value ? "text-blue-300" : "text-gray-600"
                    }`}>{opt.note}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 学習ペース */}
          <div className="mb-5">
            <div className="text-sm font-semibold text-gray-300 mb-2">📆 学習ペースは？</div>
            <div className="grid grid-cols-2 gap-2">
              {SCHEDULE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStudySchedule(opt.value)}
                  className={`py-3 rounded-xl border-2 transition-all ${
                    studySchedule === opt.value
                      ? "border-blue-500 bg-blue-500/10 text-white"
                      : "border-gray-700 bg-gray-900 text-gray-400"
                  }`}
                >
                  <span className="mr-1">{opt.icon}</span>{opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 累計時間・カバー率の目安 */}
          {estimatedHours !== null && expectedCoverage !== null && (
            <div className="bg-blue-950/50 border border-blue-800 rounded-xl p-3 mb-4 text-sm text-blue-200 space-y-1.5">
              <div>
                📊 推定累計学習時間：約{" "}
                <span className="font-bold text-blue-300">{estimatedHours} 時間</span>
                <span className="text-blue-400 ml-1">
                  {estimatedHours >= 2000 ? "（上級者レベル）"
                    : estimatedHours >= 1000 ? "（中〜上級レベル）"
                    : estimatedHours >= 500  ? "（中級レベル）"
                    : estimatedHours >= 200  ? "（初中級レベル）"
                    : "（初級レベル）"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>📚 推定カリキュラムカバー率：約</span>
                <span className={`font-bold ${
                  expectedCoverage >= 80 ? "text-green-300"
                  : expectedCoverage >= 60 ? "text-yellow-300"
                  : "text-orange-300"
                }`}>{expectedCoverage}%</span>
              </div>
              <div className="w-full bg-blue-900/50 rounded-full h-1.5 mt-1">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    expectedCoverage >= 80 ? "bg-green-400"
                    : expectedCoverage >= 60 ? "bg-yellow-400"
                    : "bg-orange-400"
                  }`}
                  style={{ width: `${expectedCoverage}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={() => setStep(1)}
            disabled={!studyDuration || !dailyHours || !studySchedule}
            className="mt-auto w-full py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-30 transition-all"
          >
            次へ →
          </button>
        </div>
      )}

      {/* ─── Step 1: 答練有無 ─── */}
      {step === 1 && (
        <div className="flex-1 flex flex-col">
          <h2 className="text-xl font-bold mb-2">答練・模試を受けましたか？</h2>
          <p className="text-gray-400 text-sm mb-8">
            点数があればより精度の高い初期データを作れます。
          </p>
          <div className="space-y-3 mb-8">
            <button
              onClick={() => setHasMockScore(true)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                hasMockScore === true ? "border-blue-500 bg-blue-500/10" : "border-gray-700 bg-gray-900"
              }`}
            >
              <div className="font-semibold">📝 はい、点数を入力する</div>
              <div className="text-sm text-gray-400 mt-1">答練・模試・前回の本試験の点数を使う</div>
            </button>
            <button
              onClick={() => setHasMockScore(false)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                hasMockScore === false ? "border-blue-500 bg-blue-500/10" : "border-gray-700 bg-gray-900"
              }`}
            >
              <div className="font-semibold">📊 いいえ、自己評価で進める</div>
              <div className="text-sm text-gray-400 mt-1">科目ごとの感覚で入力する</div>
            </button>
          </div>
          <div className="flex gap-3 mt-auto">
            <button onClick={() => setStep(0)} className="px-6 py-4 rounded-xl text-gray-400 border border-gray-700">
              ← 戻る
            </button>
            <button
              onClick={() => hasMockScore ? setStep(2) : setStep(3)}
              disabled={hasMockScore === null}
              className="flex-1 py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-30 transition-all"
            >
              次へ →
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 2: 点数入力 ─── */}
      {step === 2 && (
        <div className="flex-1 flex flex-col">
          <h2 className="text-xl font-bold mb-2">各科目の点数を入力</h2>
          <p className="text-gray-400 text-sm mb-5">直近の答練・模試または前回の本試験の点数を入力してください。</p>
          <div className="space-y-3 mb-6 flex-1">
            {subjects.map((s) => (
              <div key={s.id} className="bg-gray-900 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-sm text-gray-500">/ {s.maxScore}点</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={s.maxScore}
                    placeholder={`0 〜 ${s.maxScore}`}
                    value={mockScores[s.id] ?? ""}
                    onChange={(e) => setMockScores((p) => ({ ...p, [s.id]: e.target.value }))}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-right focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-gray-500 text-sm">点</span>
                  {mockScores[s.id] && !isNaN(Number(mockScores[s.id])) && (
                    <span className="text-sm font-bold text-blue-400 w-12 text-right">
                      {Math.round((Number(mockScores[s.id]) / s.maxScore) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-6 py-4 rounded-xl text-gray-400 border border-gray-700">
              ← 戻る
            </button>
            <button onClick={() => setStep(3)} className="flex-1 py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 transition-all">
              次へ →
            </button>
          </div>
          <button onClick={() => setStep(3)} className="w-full mt-3 text-center text-sm text-gray-500 hover:text-gray-400">
            スキップ
          </button>
        </div>
      )}

      {/* ─── Step 3: 自己評価 ─── */}
      {step === 3 && (
        <div className="flex-1 flex flex-col">
          <h2 className="text-xl font-bold mb-2">各科目の自己評価</h2>
          <p className="text-gray-400 text-sm mb-5">今の感覚で正直に選んでください。</p>
          <div className="space-y-5 mb-6 flex-1">
            {subjects.map((s) => (
              <div key={s.id}>
                <div className="text-sm font-medium text-gray-300 mb-2">{s.name}</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {SELF_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setSelfAssessment((p) => ({ ...p, [s.id]: level.value }))}
                      className={`py-2 rounded-xl border text-center transition-all ${
                        selfAssessment[s.id] === level.value
                          ? level.color
                          : "border-gray-700 bg-gray-900 text-gray-500"
                      }`}
                    >
                      <div className="text-lg">{level.icon}</div>
                      <div className="text-xs mt-0.5">{level.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(hasMockScore ? 2 : 1)} className="px-6 py-4 rounded-xl text-gray-400 border border-gray-700">
              ← 戻る
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!subjects.every((s) => selfAssessment[s.id] !== undefined)}
              className="flex-1 py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-30 transition-all"
            >
              次へ →
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 4: 苦手論点 ─── */}
      {step === 4 && (
        <div className="flex-1 flex flex-col">
          <h2 className="text-xl font-bold mb-2">苦手な論点を選ぶ</h2>
          <p className="text-gray-400 text-sm mb-4">「苦手かも」と思う論点にチェックを入れてください（任意）。</p>

          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSubjectForWeak(s.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedSubjectForWeak === s.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {s.shortName}
                {s.topics.some((t) => weakTopicIds.has(t.id)) && (
                  <span className="ml-1 text-red-400">{s.topics.filter((t) => weakTopicIds.has(t.id)).length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {activeSubject.topics.map((topic) => {
              const checked = weakTopicIds.has(topic.id);
              return (
                <button
                  key={topic.id}
                  onClick={() => setWeakTopicIds((prev) => {
                    const next = new Set(prev);
                    checked ? next.delete(topic.id) : next.add(topic.id);
                    return next;
                  })}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                    checked ? "border-red-500 bg-red-500/10" : "border-gray-700 bg-gray-900 hover:border-gray-600"
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                    checked ? "border-red-500 bg-red-500" : "border-gray-600"
                  }`}>
                    {checked && <span className="text-xs text-white font-bold">✓</span>}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{topic.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{"★".repeat(topic.weight)}{"☆".repeat(5 - topic.weight)}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {weakTopicIds.size > 0 && (
            <div className="text-center text-sm text-gray-400 mb-3">
              {weakTopicIds.size} 論点を苦手として登録
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="px-6 py-4 rounded-xl text-gray-400 border border-gray-700">
              ← 戻る
            </button>
            {previewMode ? (
              <button
                onClick={onClose}
                className="flex-1 py-4 rounded-xl font-bold bg-gray-700 hover:bg-gray-600 transition-all"
              >
                ✕ プレビューを終了
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="flex-1 py-4 rounded-xl font-bold bg-green-600 hover:bg-green-500 transition-all"
              >
                🚀 学習を始める
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
