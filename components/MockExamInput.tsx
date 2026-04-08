"use client";

import { useState } from "react";
import { AppState, TopicProgress } from "@/lib/types";
import { getSubjects } from "@/lib/examData";
import { Subject } from "@/lib/types";

interface Props {
  state: AppState;
  onSave: (newProgress: Record<string, TopicProgress>) => void;
  onBack: () => void;
}

const EXAM_TYPES = [
  { id: "touren", label: "答練", icon: "📝" },
  { id: "moshi", label: "模試", icon: "📋" },
  { id: "honshiken", label: "本試験（過去問）", icon: "🏆" },
];

// 点数から各論点の習熟度を更新（既存データとブレンド）
const applyMockScores = (
  subjects: Subject[],
  prevProgress: Record<string, TopicProgress>,
  scoreMap: Record<string, number>,
  blendRatio: number // 新スコアの重み (0-1)
): Record<string, TopicProgress> => {
  const result = { ...prevProgress };

  for (const subject of subjects) {
    const rawScore = scoreMap[subject.id];
    if (rawScore === undefined || rawScore === null) continue;

    const newBasePct = Math.round((rawScore / subject.maxScore) * 100);
    const avgWeight = subject.topics.reduce((s, t) => s + t.weight, 0) / subject.topics.length;

    for (const topic of subject.topics) {
      const prev = prevProgress[topic.id];
      const prevProficiency = prev?.proficiency ?? 0;

      // 重要度による補正（高い論点は少し高め、低い論点は低め）
      const weightBonus = (topic.weight - avgWeight) * 2;
      // ランダム誤差 ±8%
      const noise = (Math.random() - 0.5) * 16;
      const newPct = Math.max(0, Math.min(100, Math.round(newBasePct + weightBonus + noise)));

      // 既存データとブレンド（新スコアを重視）
      const blended = prev
        ? Math.round(blendRatio * newPct + (1 - blendRatio) * prevProficiency)
        : newPct;

      // 正誤件数も更新
      const estimatedTotal = (prev?.studyCount ?? 0) + subject.topics.length * 2;
      const newCorrect = Math.round((blended / 100) * estimatedTotal);
      const newWrong = estimatedTotal - newCorrect;

      result[topic.id] = {
        topicId: topic.id,
        proficiency: blended,
        correctCount: newCorrect,
        wrongCount: newWrong,
        studyCount: estimatedTotal,
        weakFlag: prev?.weakFlag ?? false,
        lastStudied: new Date().toISOString(),
      };
    }
  }

  return result;
};

export default function MockExamInput({ state, onSave, onBack }: Props) {
  const { examConfig } = state;
  if (!examConfig) return null;

  const subjects = getSubjects(examConfig.type);
  const [examType, setExamType] = useState("touren");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const handleScore = (subjectId: string, val: string) => {
    setScores((prev) => ({ ...prev, [subjectId]: val }));
  };

  const hasAnyScore = Object.values(scores).some(
    (v) => v !== "" && !isNaN(Number(v))
  );

  const handleSave = () => {
    const scoreMap: Record<string, number> = {};
    for (const s of subjects) {
      const val = scores[s.id];
      if (val !== undefined && val !== "" && !isNaN(Number(val))) {
        scoreMap[s.id] = Math.min(Number(val), s.maxScore);
      }
    }
    // 本試験なら強く反映（0.8）、答練なら控えめ（0.6）
    const blend = examType === "honshiken" ? 0.8 : examType === "moshi" ? 0.7 : 0.6;
    const newProgress = applyMockScores(subjects, state.topicProgress, scoreMap, blend);
    onSave(newProgress);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onBack();
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6 pt-2">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-2xl leading-none">←</button>
        <h1 className="text-xl font-bold">答練・模試を入力</h1>
      </div>

      {/* 試験種別 */}
      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-2">試験の種類</div>
        <div className="grid grid-cols-3 gap-2">
          {EXAM_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setExamType(t.id)}
              className={`py-3 rounded-xl border-2 text-center transition-all ${
                examType === t.id
                  ? "border-blue-500 bg-blue-500/10 text-white"
                  : "border-gray-700 bg-gray-900 text-gray-400"
              }`}
            >
              <div className="text-xl mb-1">{t.icon}</div>
              <div className="text-sm font-medium">{t.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 科目別点数入力 */}
      <div className="mb-2 text-sm text-gray-400">各科目の点数</div>
      <div className="space-y-3 mb-6">
        {subjects.map((s) => {
          const val = scores[s.id] ?? "";
          const pct = val !== "" && !isNaN(Number(val))
            ? Math.round((Number(val) / s.maxScore) * 100)
            : null;
          const prev = (() => {
            const topicScores = s.topics.map((t) => state.topicProgress[t.id]?.proficiency ?? 0);
            return Math.round(topicScores.reduce((a, b) => a + b, 0) / topicScores.length);
          })();

          return (
            <div key={s.id} className="bg-gray-900 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm">{s.name}</span>
                <div className="text-right text-xs text-gray-500">
                  現在の習熟度: <span className="text-blue-400">{prev}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={s.maxScore}
                  placeholder={`0 〜 ${s.maxScore}`}
                  value={val}
                  onChange={(e) => handleScore(s.id, e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-right focus:outline-none focus:border-blue-500"
                />
                <span className="text-gray-500 text-sm shrink-0">/ {s.maxScore}点</span>
                {pct !== null && (
                  <span className={`text-sm font-bold w-12 text-right shrink-0 ${
                    pct >= 70 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"
                  }`}>
                    {pct}%
                  </span>
                )}
              </div>
              {/* 変化の矢印 */}
              {pct !== null && (
                <div className="mt-2 text-xs text-gray-500">
                  {pct > prev + 3
                    ? <span className="text-green-400">↑ {pct - prev}% 向上</span>
                    : pct < prev - 3
                    ? <span className="text-red-400">↓ {prev - pct}% 低下</span>
                    : <span className="text-gray-400">→ ほぼ変化なし</span>
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-gray-600 mb-6">
        ※ 入力した点数を元に各論点の習熟度を自動更新します。
        {examType === "honshiken" ? "本試験のため強く反映されます。" : ""}
        入力しなかった科目は変更されません。
      </div>

      {saved ? (
        <div className="w-full py-4 rounded-xl font-bold text-center bg-green-600 text-white">
          ✓ 反映しました！
        </div>
      ) : (
        <button
          onClick={handleSave}
          disabled={!hasAnyScore}
          className="w-full py-4 rounded-xl font-bold text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          習熟度に反映する
        </button>
      )}
    </div>
  );
}
