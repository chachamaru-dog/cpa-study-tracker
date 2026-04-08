"use client";

import { useState } from "react";
import { ExamConfig, ExamType } from "@/lib/types";

interface Props {
  onSave: (config: ExamConfig) => void;
}

const EXAM_OPTIONS: { type: ExamType; label: string; description: string }[] = [
  { type: "short_may", label: "短答式（5月）", description: "財務・管理・監査・企業法 / 合格基準70%" },
  { type: "short_dec", label: "短答式（12月）", description: "財務・管理・監査・企業法 / 合格基準70%" },
  { type: "essay", label: "論文式（8月）", description: "会計学・監査・企業法・租税法・選択科目" },
];

export default function ExamSetup({ onSave }: Props) {
  const [selectedType, setSelectedType] = useState<ExamType | null>(null);
  const [examDate, setExamDate] = useState("");

  const handleSave = () => {
    if (!selectedType || !examDate) return;
    onSave({
      type: selectedType,
      label: EXAM_OPTIONS.find((o) => o.type === selectedType)!.label,
      examDate,
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-2 text-center">公認会計士試験</h1>
        <p className="text-gray-400 text-center mb-8">受験する試験を選択してください</p>

        <div className="space-y-3 mb-8">
          {EXAM_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => setSelectedType(opt.type)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selectedType === opt.type
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-gray-700 bg-gray-900 hover:border-gray-500"
              }`}
            >
              <div className="font-semibold text-lg">{opt.label}</div>
              <div className="text-sm text-gray-400 mt-1">{opt.description}</div>
            </button>
          ))}
        </div>

        <div className="mb-8">
          <label className="block text-sm text-gray-400 mb-2">試験日</label>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!selectedType || !examDate}
          className="w-full py-4 rounded-xl font-semibold text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          学習を始める
        </button>
      </div>
    </div>
  );
}
