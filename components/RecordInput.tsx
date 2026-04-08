"use client";

import { useState } from "react";
import { AppState } from "@/lib/types";
import { getSubjects } from "@/lib/examData";

interface Props {
  state: AppState;
  onRecord: (topicId: string, result: "correct" | "wrong" | "weak") => void;
  onBack: () => void;
}

export default function RecordInput({ state, onRecord, onBack }: Props) {
  const { examConfig } = state;
  if (!examConfig) return null;

  const subjects = getSubjects(examConfig.type);
  const [selectedSubject, setSelectedSubject] = useState(subjects[0].id);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [lastRecorded, setLastRecorded] = useState<{ topicName: string; result: string } | null>(null);

  const currentSubject = subjects.find((s) => s.id === selectedSubject)!;

  const handleRecord = (result: "correct" | "wrong" | "weak") => {
    if (!selectedTopic) return;
    const topic = currentSubject.topics.find((t) => t.id === selectedTopic);
    onRecord(selectedTopic, result);
    setLastRecorded({
      topicName: topic?.name ?? "",
      result: result === "correct" ? "正解" : result === "wrong" ? "不正解" : "苦手",
    });
    setSelectedTopic(null);
    setTimeout(() => setLastRecorded(null), 2000);
  };

  const RESULT_BUTTONS: { result: "correct" | "wrong" | "weak"; label: string; color: string }[] = [
    { result: "correct", label: "✓ 正解", color: "bg-green-600 hover:bg-green-500" },
    { result: "wrong", label: "✗ 不正解", color: "bg-red-600 hover:bg-red-500" },
    { result: "weak", label: "⚠ 苦手", color: "bg-orange-600 hover:bg-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6 pt-2">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-2xl leading-none">
          ←
        </button>
        <h1 className="text-xl font-bold">問題を記録する</h1>
      </div>

      {/* 記録完了トースト */}
      {lastRecorded && (
        <div className="bg-blue-600 rounded-xl p-3 mb-4 text-center animate-pulse">
          <span className="font-semibold">{lastRecorded.topicName}</span> を{" "}
          <span className="font-bold">{lastRecorded.result}</span> で記録しました
        </div>
      )}

      {/* 科目選択 */}
      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-2">科目</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedSubject(s.id);
                setSelectedTopic(null);
              }}
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
      </div>

      {/* 論点選択 */}
      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-2">論点</div>
        <div className="space-y-2">
          {currentSubject.topics.map((topic) => {
            const progress = state.topicProgress[topic.id];
            const score = progress?.proficiency ?? 0;
            const total = (progress?.correctCount ?? 0) + (progress?.wrongCount ?? 0);

            return (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic.id === selectedTopic ? null : topic.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                  selectedTopic === topic.id
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-gray-700 bg-gray-900 hover:border-gray-500"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{topic.name}</span>
                  <div className="text-right">
                    {total > 0 ? (
                      <span className={`text-sm font-bold ${
                        score >= 70 ? "text-green-400" : score >= 40 ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {score}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">未記録</span>
                    )}
                    {progress?.weakFlag && (
                      <span className="ml-2 text-xs text-red-400">苦手</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 結果ボタン */}
      {selectedTopic && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950 border-t border-gray-800">
          <div className="max-w-lg mx-auto">
            <div className="text-sm text-gray-400 mb-3 text-center">
              「{currentSubject.topics.find((t) => t.id === selectedTopic)?.name}」の結果を記録
            </div>
            <div className="grid grid-cols-3 gap-2">
              {RESULT_BUTTONS.map(({ result, label, color }) => (
                <button
                  key={result}
                  onClick={() => handleRecord(result)}
                  className={`py-4 rounded-xl font-bold text-sm ${color} transition-all`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
