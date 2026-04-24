"use client";

import { useState } from "react";
import { ExamConfig, ExamType } from "@/lib/types";

type Category = "cpa" | "boki";

const CATEGORY_OPTIONS: { type: Category; label: string; sub: string }[] = [
  { type: "cpa",  label: "公認会計士",  sub: "CPA試験（短答式・論文式）" },
  { type: "boki", label: "日商簿記",    sub: "1級・2級・3級" },
];

const EXAM_OPTIONS: { type: ExamType; label: string; description: string; category: Category }[] = [
  { type: "short_may", category: "cpa",  label: "短答式（5月）",  description: "財務・管理・監査・企業法 / 合格基準70%" },
  { type: "short_dec", category: "cpa",  label: "短答式（12月）", description: "財務・管理・監査・企業法 / 合格基準70%" },
  { type: "essay",     category: "cpa",  label: "論文式（8月）",  description: "会計学・監査・企業法・租税法・選択科目" },
  { type: "boki1",     category: "boki", label: "簿記1級",        description: "商業簿記・会計学・工業簿記・原価計算" },
  { type: "boki2",     category: "boki", label: "簿記2級",        description: "商業簿記・工業簿記 / 合格基準70点" },
  { type: "boki3",     category: "boki", label: "簿記3級",        description: "商業簿記のみ / 合格基準70点" },
];

export default function ExamSetup({ onSave }: { onSave: (config: ExamConfig) => void }) {
  const [category,     setCategory]     = useState<Category | null>(null);
  const [selectedType, setSelectedType] = useState<ExamType | null>(null);
  const [examDate,     setExamDate]     = useState("");

  const filtered = EXAM_OPTIONS.filter(o => o.category === category);

  const handleSave = () => {
    if (!selectedType || !examDate) return;
    onSave({
      type: selectedType,
      label: EXAM_OPTIONS.find(o => o.type === selectedType)!.label,
      examDate,
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: 8 }}>
            Study Tracker
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", marginBottom: 6 }}>試験を選択</div>
          <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>受験する資格・級を選んでください</div>
        </div>

        {/* カテゴリ選択 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {CATEGORY_OPTIONS.map(cat => (
            <button key={cat.type} onClick={() => { setCategory(cat.type); setSelectedType(null); }}
              style={{
                padding: "14px 12px", borderRadius: 10, textAlign: "center",
                border: `1.5px solid ${category === cat.type ? "var(--sky)" : "var(--line-md)"}`,
                background: category === cat.type ? "rgba(74,143,168,0.08)" : "var(--bg-card)",
                cursor: "pointer", transition: "all 0.2s", boxShadow: "var(--shadow-card)",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 800, color: category === cat.type ? "var(--sky)" : "var(--ink)", marginBottom: 3 }}>
                {cat.label}
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-muted)" }}>{cat.sub}</div>
            </button>
          ))}
        </div>

        {/* 試験選択 */}
        {category && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {filtered.map(opt => (
              <button key={opt.type} onClick={() => setSelectedType(opt.type)}
                style={{
                  textAlign: "left", padding: "13px 16px", borderRadius: 10,
                  border: `1.5px solid ${selectedType === opt.type ? "var(--sky)" : "var(--line-md)"}`,
                  background: selectedType === opt.type ? "rgba(74,143,168,0.08)" : "var(--bg-card)",
                  cursor: "pointer", transition: "all 0.2s", boxShadow: "var(--shadow-card)",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: selectedType === opt.type ? "var(--sky)" : "var(--ink)", marginBottom: 2 }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{opt.description}</div>
              </button>
            ))}
          </div>
        )}

        {/* 試験日 */}
        {selectedType && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", marginBottom: 6 }}>試験日</div>
            <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)}
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 8,
                border: "1.5px solid var(--line-md)", background: "var(--bg-card)",
                color: "var(--ink)", fontSize: 13, boxSizing: "border-box", outline: "none",
              }}
            />
          </div>
        )}

        <button onClick={handleSave} disabled={!selectedType || !examDate} className="btn-main"
          style={{ width: "100%", fontSize: 14, padding: "14px", opacity: (!selectedType || !examDate) ? 0.4 : 1 }}
        >
          学習を始める
        </button>
      </div>
    </div>
  );
}
