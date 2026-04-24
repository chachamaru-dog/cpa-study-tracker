"use client";

import { useState } from "react";
import { ArrowLeft, CalendarDays, RefreshCw, Trash2, Eye } from "lucide-react";
import { ExamConfig, ExamType } from "@/lib/types";

type Category = "cpa" | "boki";

const EXAM_OPTIONS: { type: ExamType; label: string; category: Category }[] = [
  { type: "short_may", label: "短答式（5月）",  category: "cpa"  },
  { type: "short_dec", label: "短答式（12月）", category: "cpa"  },
  { type: "essay",     label: "論文式（8月）",  category: "cpa"  },
  { type: "boki1",     label: "簿記1級",        category: "boki" },
  { type: "boki2",     label: "簿記2級",        category: "boki" },
  { type: "boki3",     label: "簿記3級",        category: "boki" },
];

const categoryOf = (type: ExamType): Category =>
  ["boki1","boki2","boki3"].includes(type) ? "boki" : "cpa";

interface Props {
  examConfig: ExamConfig;
  onBack: () => void;
  onPreviewOnboarding: () => void;
  onRedoOnboarding: () => void;
  onResetData: () => void;
  onUpdateExamConfig: (config: ExamConfig) => void;
}

const card: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1.5px solid var(--line-md)",
  borderRadius: 12,
  overflow: "hidden",
};

const SectionLabel = ({ children }: { children: string }) => (
  <div style={{
    padding: "10px 16px 8px",
    fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: "0.15em", color: "var(--ink-muted)",
    borderBottom: "1px solid var(--line)",
  }}>
    {children}
  </div>
);

const Row = ({ icon, label, sub, color, onClick, danger }: {
  icon: React.ReactNode; label: string; sub?: string;
  color?: string; onClick?: () => void; danger?: boolean;
}) => (
  <button
    onClick={onClick}
    style={{
      width: "100%", textAlign: "left", padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 12,
      background: "none", border: "none", cursor: onClick ? "pointer" : "default",
      borderTop: "1px solid var(--line)",
    }}
  >
    <span style={{ color: color ?? "var(--ink-muted)", flexShrink: 0 }}>{icon}</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: danger ? "var(--terra)" : "var(--ink)" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
    {onClick && <span style={{ color: "var(--ink-faint)", fontSize: 16 }}>›</span>}
  </button>
);

export default function SettingsScreen({
  examConfig, onBack, onPreviewOnboarding, onRedoOnboarding, onResetData, onUpdateExamConfig,
}: Props) {
  const [editingExam,  setEditingExam]  = useState(false);
  const [selectedType, setSelectedType] = useState<ExamType>(examConfig.type);
  const [examDate,     setExamDate]     = useState(examConfig.examDate);
  const [category,     setCategory]     = useState<Category>(categoryOf(examConfig.type));

  const handleSaveExam = () => {
    const label = EXAM_OPTIONS.find(o => o.type === selectedType)!.label;
    onUpdateExamConfig({ type: selectedType, label, examDate });
    setEditingExam(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>

      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "22px 20px 16px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          <ArrowLeft size={18} strokeWidth={1.6} color="var(--ink-muted)" />
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>設定</span>
      </div>

      <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* 試験設定 */}
        <div style={card}>
          <SectionLabel>試験設定</SectionLabel>

          {!editingExam ? (
            <>
              <div style={{ padding: "14px 16px", borderTop: "1px solid var(--line)" }}>
                <div style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 4 }}>現在の試験</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{examConfig.label}</div>
                <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>
                  試験日：{new Date(examConfig.examDate).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
                </div>
              </div>
              <button
                onClick={() => setEditingExam(true)}
                style={{
                  width: "100%", textAlign: "left", padding: "12px 16px",
                  display: "flex", alignItems: "center", gap: 12,
                  background: "none", border: "none", cursor: "pointer",
                  borderTop: "1px solid var(--line)",
                }}
              >
                <CalendarDays size={15} strokeWidth={1.5} color="var(--sky)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--sky)", flex: 1 }}>試験日・種別を変更する</span>
                <span style={{ color: "var(--ink-faint)", fontSize: 16 }}>›</span>
              </button>
            </>
          ) : (
            <div style={{ padding: "14px 16px", borderTop: "1px solid var(--line)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", marginBottom: 8 }}>試験種別</div>
              {/* カテゴリ */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                {(["cpa", "boki"] as Category[]).map(cat => (
                  <button key={cat} onClick={() => { setCategory(cat); setSelectedType(EXAM_OPTIONS.find(o => o.category === cat)!.type); }}
                    style={{
                      padding: "9px 8px", borderRadius: 8, textAlign: "center",
                      border: `1.5px solid ${category === cat ? "var(--sky)" : "var(--line-md)"}`,
                      background: category === cat ? "rgba(74,143,168,0.08)" : "var(--bg-elevated)",
                      cursor: "pointer", fontSize: 12, fontWeight: 700,
                      color: category === cat ? "var(--sky)" : "var(--ink)",
                    }}
                  >
                    {cat === "cpa" ? "公認会計士" : "日商簿記"}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {EXAM_OPTIONS.filter(o => o.category === category).map(opt => (
                  <button key={opt.type} onClick={() => setSelectedType(opt.type)}
                    style={{
                      padding: "10px 14px", borderRadius: 8, textAlign: "left",
                      border: `1.5px solid ${selectedType === opt.type ? "var(--sky)" : "var(--line-md)"}`,
                      background: selectedType === opt.type ? "rgba(74,143,168,0.08)" : "var(--bg-elevated)",
                      cursor: "pointer", fontSize: 13, fontWeight: 600,
                      color: selectedType === opt.type ? "var(--sky)" : "var(--ink)",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", marginBottom: 6 }}>試験日</div>
              <input
                type="date"
                value={examDate}
                onChange={e => setExamDate(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8,
                  border: "1.5px solid var(--line-md)", background: "var(--bg-elevated)",
                  color: "var(--ink)", fontSize: 13, marginBottom: 12,
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setEditingExam(false)}
                  className="btn-sub"
                  style={{ flex: 1, fontSize: 12 }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveExam}
                  className="btn-main"
                  style={{ flex: 2, fontSize: 12 }}
                  disabled={!examDate}
                >
                  保存する
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 初期設定 */}
        <div style={card}>
          <SectionLabel>初期設定</SectionLabel>
          <Row
            icon={<Eye size={15} strokeWidth={1.5} />}
            label="初期設定をプレビュー"
            sub="新規ユーザーの画面を確認（データは変更されません）"
            onClick={onPreviewOnboarding}
          />
          <Row
            icon={<RefreshCw size={15} strokeWidth={1.5} />}
            label="初期設定をやり直す"
            sub="学習歴・点数を再入力して習熟度を上書きする"
            onClick={onRedoOnboarding}
          />
        </div>

        {/* データ管理 */}
        <div style={card}>
          <SectionLabel>データ管理</SectionLabel>
          <Row
            icon={<Trash2 size={15} strokeWidth={1.5} />}
            label="すべてのデータをリセット"
            sub="学習記録・習熟度・設定をすべて削除して最初から始める"
            danger
            onClick={onResetData}
          />
        </div>

      </div>
    </div>
  );
}
