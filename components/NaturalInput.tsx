"use client";

import { useState } from "react";
import { AppState, StudyMethod, STUDY_METHOD_META } from "@/lib/types";
import { getSubjects } from "@/lib/examData";

export interface StudySession {
  subjectId: string;
  method: StudyMethod;
  hours: number;
  concentration: number;
}

interface Props {
  state: AppState;
  onApply: (session: StudySession) => void;
  onBack: () => void;
}

const HOUR_OPTIONS: { label: string; value: number }[] = [
  { label: "30分", value: 0.5 },
  { label: "1時間", value: 1 },
  { label: "1.5h", value: 1.5 },
  { label: "2時間", value: 2 },
  { label: "3時間", value: 3 },
  { label: "4時間", value: 4 },
  { label: "5時間", value: 5 },
  { label: "6時間", value: 6 },
  { label: "8時間", value: 8 },
  { label: "10時間", value: 10 },
  { label: "12時間", value: 12 },
  { label: "12時間+", value: 13 },
];

const CONCENTRATION_OPTIONS = [
  { value: 1, label: "ぼんやり", emoji: "😴" },
  { value: 2, label: "いまいち", emoji: "😐" },
  { value: 3, label: "まあまあ", emoji: "🙂" },
  { value: 4, label: "集中できた", emoji: "😊" },
  { value: 5, label: "ゾーンに入った", emoji: "🔥" },
];

const METHOD_OPTIONS = Object.entries(STUDY_METHOD_META) as [StudyMethod, typeof STUDY_METHOD_META[StudyMethod]][];

const SUBJECT_COLORS = [
  "bg-blue-600 border-blue-500",
  "bg-violet-600 border-violet-500",
  "bg-emerald-600 border-emerald-500",
  "bg-orange-600 border-orange-500",
  "bg-rose-600 border-rose-500",
  "bg-cyan-600 border-cyan-500",
  "bg-yellow-600 border-yellow-500",
];

export default function NaturalInput({ state, onApply, onBack }: Props) {
  const { examConfig } = state;
  if (!examConfig) return null;

  const subjects = getSubjects(examConfig.type);

  const [step, setStep] = useState(0);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [method, setMethod] = useState<StudyMethod | null>(null);
  const [hours, setHours] = useState<number | null>(null);
  const [concentration, setConcentration] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const totalSteps = 4;

  const handleDone = () => {
    if (!subjectId || !method || !hours || !concentration) return;
    onApply({ subjectId, method, hours, concentration });
    setDone(true);
    setTimeout(() => {
      setDone(false);
      setStep(0);
      setSubjectId(null);
      setMethod(null);
      setHours(null);
      setConcentration(null);
    }, 1800);
  };

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const selectedMethod = method ? STUDY_METHOD_META[method] : null;
  const selectedConc = CONCENTRATION_OPTIONS.find((o) => o.value === concentration);

  if (done) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
        <div className="text-6xl animate-bounce">✨</div>
        <div className="text-2xl font-bold text-green-400">記録完了！</div>
        <div className="text-gray-400 text-sm">
          {selectedSubject?.name} · {hours}h · 集中度 {concentration}/5
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 max-w-lg mx-auto pb-32">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6 pt-2">
        <button
          onClick={step === 0 ? onBack : () => setStep((s) => s - 1)}
          className="text-gray-400 hover:text-white text-2xl leading-none"
        >
          ←
        </button>
        <h1 className="text-xl font-bold">今日の学習を記録</h1>
        <div className="ml-auto text-xs text-gray-500">{step + 1} / {totalSteps}</div>
      </div>

      {/* プログレスバー */}
      <div className="flex gap-1 mb-8">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-all duration-300 ${
              i <= step ? "bg-blue-500" : "bg-gray-700"
            }`}
          />
        ))}
      </div>

      {/* Step 1: 科目 */}
      {step === 0 && (
        <div>
          <h2 className="text-xl font-bold mb-1">どの科目をやった？</h2>
          <p className="text-gray-500 text-sm mb-6">今日勉強した科目を選んでください</p>
          <div className="grid grid-cols-1 gap-3">
            {subjects.map((s, i) => (
              <button
                key={s.id}
                onClick={() => {
                  setSubjectId(s.id);
                  setStep(1);
                }}
                className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-bold text-base transition-all active:scale-95 ${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: 学習方法 */}
      {step === 1 && (
        <div>
          <div className="text-xs text-blue-400 font-semibold mb-1">{selectedSubject?.name}</div>
          <h2 className="text-xl font-bold mb-1">何をやった？</h2>
          <p className="text-gray-500 text-sm mb-6">学習方法を選んでください</p>
          <div className="grid grid-cols-2 gap-3">
            {METHOD_OPTIONS.map(([m, meta]) => (
              <button
                key={m}
                onClick={() => {
                  setMethod(m);
                  setStep(2);
                }}
                className={`px-4 py-4 rounded-2xl border-2 transition-all active:scale-95 text-left ${
                  meta.type === "input"
                    ? "border-purple-600 bg-purple-900/30"
                    : "border-emerald-600 bg-emerald-900/30"
                }`}
              >
                <div className="text-2xl mb-1">{meta.icon}</div>
                <div className="font-semibold text-sm">{meta.label}</div>
                <div className={`text-xs mt-0.5 ${meta.type === "input" ? "text-purple-400" : "text-emerald-400"}`}>
                  {meta.type === "input" ? "インプット" : "アウトプット"}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: 時間 */}
      {step === 2 && (
        <div>
          <div className="text-xs text-blue-400 font-semibold mb-1">
            {selectedSubject?.name} · {selectedMethod?.icon} {selectedMethod?.label}
          </div>
          <h2 className="text-xl font-bold mb-1">何時間やった？</h2>
          <p className="text-gray-500 text-sm mb-6">今日の学習時間を選んでください</p>
          <div className="grid grid-cols-3 gap-2">
            {HOUR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setHours(opt.value);
                  setStep(3);
                }}
                className="py-4 rounded-2xl border-2 border-gray-700 bg-gray-900 hover:border-blue-500 hover:bg-blue-900/20 font-bold text-sm transition-all active:scale-95"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: 集中度 */}
      {step === 3 && (
        <div>
          <div className="text-xs text-blue-400 font-semibold mb-1">
            {selectedSubject?.name} · {selectedMethod?.label} · {hours}h
          </div>
          <h2 className="text-xl font-bold mb-1">集中できた？</h2>
          <p className="text-gray-500 text-sm mb-6">今日の集中度を教えてください</p>
          <div className="space-y-3">
            {CONCENTRATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setConcentration(opt.value)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all active:scale-95 ${
                  concentration === opt.value
                    ? "border-blue-500 bg-blue-900/30"
                    : "border-gray-700 bg-gray-900"
                }`}
              >
                <span className="text-3xl">{opt.emoji}</span>
                <div className="text-left">
                  <div className="font-bold">{opt.label}</div>
                  <div className="flex gap-0.5 mt-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-4 h-1.5 rounded-full ${i < opt.value ? "bg-blue-500" : "bg-gray-700"}`}
                      />
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 確定ボタン（Step 4のみ） */}
      {step === 3 && concentration && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950/95 backdrop-blur border-t border-gray-800">
          <div className="max-w-lg mx-auto">
            <div className="text-xs text-gray-500 text-center mb-2">
              {selectedSubject?.name} · {selectedMethod?.label} · {hours}h · {selectedConc?.emoji} {selectedConc?.label}
            </div>
            <button
              onClick={handleDone}
              className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl py-4 font-bold text-lg transition-all active:scale-95"
            >
              記録する ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
