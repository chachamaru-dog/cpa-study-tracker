"use client";

import { useState } from "react";
import { AppState } from "@/lib/types";
import { getSubjects } from "@/lib/examData";

interface Props {
  state: AppState;
  onBack: () => void;
}

const getProficiencyColor = (score: number, weakFlag: boolean): string => {
  if (weakFlag && score < 60) return "bg-red-500/80 border-red-400";
  if (score >= 80) return "bg-green-600/80 border-green-500";
  if (score >= 60) return "bg-green-500/50 border-green-400";
  if (score >= 40) return "bg-yellow-500/50 border-yellow-400";
  if (score >= 20) return "bg-orange-500/50 border-orange-400";
  if (score > 0) return "bg-red-500/40 border-red-400";
  return "bg-gray-800 border-gray-700";
};

const getTextColor = (score: number): string => {
  if (score >= 60) return "text-white";
  if (score >= 20) return "text-white";
  return "text-gray-400";
};

const getWeightLabel = (weight: number): string => {
  return "★".repeat(weight) + "☆".repeat(5 - weight);
};

export default function Heatmap({ state, onBack }: Props) {
  const { examConfig, topicProgress } = state;
  if (!examConfig) return null;

  const subjects = getSubjects(examConfig.type);
  const [selectedSubject, setSelectedSubject] = useState(subjects[0].id);

  const currentSubject = subjects.find((s) => s.id === selectedSubject)!;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6 pt-2">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-2xl leading-none"
        >
          ←
        </button>
        <h1 className="text-xl font-bold">論点ヒートマップ</h1>
      </div>

      {/* 科目タブ */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSubject(s.id)}
            className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedSubject === s.id
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* 凡例 */}
      <div className="flex gap-3 mb-4 text-xs text-gray-400 flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-800 border border-gray-700" />
          <span>未学習</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500/40 border border-red-400" />
          <span>〜19%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-500/50 border border-orange-400" />
          <span>20〜39%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500/50 border border-yellow-400" />
          <span>40〜59%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500/50 border border-green-400" />
          <span>60〜79%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-600/80 border border-green-500" />
          <span>80%+</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500/80 border border-red-400" />
          <span>苦手</span>
        </div>
      </div>

      {/* ヒートマップグリッド */}
      <div className="grid grid-cols-2 gap-2">
        {currentSubject.topics.map((topic) => {
          const progress = topicProgress[topic.id];
          const score = progress?.proficiency ?? 0;
          const weakFlag = progress?.weakFlag ?? false;
          const total = (progress?.correctCount ?? 0) + (progress?.wrongCount ?? 0);

          return (
            <div
              key={topic.id}
              className={`border rounded-xl p-3 transition-all ${getProficiencyColor(score, weakFlag)}`}
            >
              <div className={`font-medium text-sm mb-1 ${getTextColor(score)}`}>
                {topic.name}
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className={`text-2xl font-bold ${getTextColor(score)}`}>
                    {score > 0 ? `${score}%` : "−"}
                  </div>
                  {total > 0 && (
                    <div className="text-xs opacity-60">
                      {progress?.correctCount ?? 0}正 / {progress?.wrongCount ?? 0}誤
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-50">{getWeightLabel(topic.weight)}</div>
                  {weakFlag && (
                    <div className="text-xs text-red-300 font-semibold mt-0.5">苦手</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 苦手論点サマリー */}
      {currentSubject.topics.some((t) => topicProgress[t.id]?.weakFlag) && (
        <div className="mt-6 bg-red-950/50 border border-red-800 rounded-xl p-4">
          <div className="text-sm font-semibold text-red-300 mb-2">⚠ 苦手論点</div>
          <div className="space-y-1">
            {currentSubject.topics
              .filter((t) => topicProgress[t.id]?.weakFlag)
              .map((t) => (
                <div key={t.id} className="text-sm text-red-200">
                  • {t.name} ({topicProgress[t.id]?.proficiency ?? 0}%)
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
