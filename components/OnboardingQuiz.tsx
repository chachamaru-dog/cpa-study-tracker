"use client";

import { useState } from "react";
import { Subject } from "@/lib/types";
export interface OnboardingAnswers {
  mockScores:     Record<string, number | null>;
  selfAssessment: Record<string, number>;
  weakTopicIds:   string[];
}

interface Props {
  subjects: Subject[];
  onComplete: (answers: OnboardingAnswers) => void;
  previewMode?: boolean;
  onClose?: () => void;
}

const SELF_LEVELS = [
  { value: 1, label: "全然ダメ", color: "border-red-500 bg-red-500/10 text-red-300" },
  { value: 2, label: "苦手",     color: "border-orange-500 bg-orange-500/10 text-orange-300" },
  { value: 3, label: "普通",     color: "border-yellow-500 bg-yellow-500/10 text-yellow-300" },
  { value: 4, label: "得意",     color: "border-green-500 bg-green-500/10 text-green-300" },
  { value: 5, label: "自信あり", color: "border-blue-500 bg-blue-500/10 text-blue-300" },
];


export default function OnboardingQuiz({ subjects, onComplete, previewMode = false, onClose }: Props) {
  const [step, setStep] = useState(0);

  // Step 0: 答練有無
  const [hasMockScore, setHasMockScore] = useState<boolean | null>(null);

  // Step 1: 点数
  const [mockScores, setMockScores] = useState<Record<string, string>>({});

  // Step 2: 自己評価
  const [selfAssessment, setSelfAssessment] = useState<Record<string, number>>({});

  // Step 3: 苦手論点
  const [weakTopicIds, setWeakTopicIds] = useState<Set<string>>(new Set());
  const [selectedSubjectForWeak, setSelectedSubjectForWeak] = useState(subjects[0].id);

  const totalSteps = 4;

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
      mockScores: parsedMock,
      selfAssessment: parsedSelf,
      weakTopicIds: [...weakTopicIds],
    });
  };

  const activeSubject = subjects.find((s) => s.id === selectedSubjectForWeak)!;

  const selBtn = (active: boolean): React.CSSProperties => ({
    textAlign: "left", padding: "12px 14px", borderRadius: 10, cursor: "pointer",
    border: `1.5px solid ${active ? "var(--sky)" : "var(--line-md)"}`,
    background: active ? "rgba(74,143,168,0.08)" : "var(--bg-card)",
    transition: "all 0.2s", width: "100%",
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", padding: "0 16px 24px", maxWidth: 480, margin: "0 auto" }}>
      {/* プレビューモードバナー */}
      {previewMode && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--amber-light)", border: "1px solid var(--amber-border)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "var(--amber)", fontWeight: 600 }}>プレビューモード — データは保存されません</div>
          <button onClick={onClose} style={{ fontSize: 12, color: "var(--amber)", background: "none", border: "none", cursor: "pointer" }}>閉じる ✕</button>
        </div>
      )}

      {/* プログレスバー */}
      <div style={{ paddingTop: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-muted)", marginBottom: 6 }}>
          <span>初期設定</span>
          <span>{step + 1} / {totalSteps}</span>
        </div>
        <div style={{ width: "100%", background: "var(--bg-elevated)", borderRadius: 4, height: 4 }}>
          <div style={{ height: 4, borderRadius: 4, background: "var(--sky)", transition: "width 0.5s", width: `${((step + 1) / totalSteps) * 100}%` }} />
        </div>
      </div>

      {/* ─── Step 0: 答練有無 ─── */}
      {step === 0 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", marginBottom: 4 }}>答練・模試を受けましたか？</div>
          <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 24 }}>点数があればより精度の高い初期データを作れます。</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            <button onClick={() => setHasMockScore(true)} style={selBtn(hasMockScore === true)}>
              <div style={{ fontSize: 13, fontWeight: 700, color: hasMockScore === true ? "var(--sky)" : "var(--ink)", marginBottom: 2 }}>はい、点数を入力する</div>
              <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>答練・模試・前回の本試験の点数を使う</div>
            </button>
            <button onClick={() => setHasMockScore(false)} style={selBtn(hasMockScore === false)}>
              <div style={{ fontSize: 13, fontWeight: 700, color: hasMockScore === false ? "var(--sky)" : "var(--ink)", marginBottom: 2 }}>いいえ、自己評価で進める</div>
              <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>科目ごとの感覚で入力する</div>
            </button>
          </div>
          <div style={{ marginTop: "auto" }}>
            <button onClick={() => hasMockScore ? setStep(1) : setStep(2)} disabled={hasMockScore === null} className="btn-main" style={{ width: "100%", opacity: hasMockScore === null ? 0.4 : 1 }}>次へ →</button>
          </div>
        </div>
      )}

      {/* ─── Step 1: 点数入力 ─── */}
      {step === 1 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", marginBottom: 4 }}>各科目の点数を入力</div>
          <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 16 }}>直近の答練・模試または前回の本試験の点数を入力してください。</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, flex: 1 }}>
            {subjects.map((s) => (
              <div key={s.id} style={{ background: "var(--bg-card)", border: "1.5px solid var(--line-md)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{s.name}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>/ {s.maxScore}点</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number" min={0} max={s.maxScore} placeholder={`0〜${s.maxScore}`}
                    value={mockScores[s.id] ?? ""}
                    onChange={(e) => setMockScores((p) => ({ ...p, [s.id]: e.target.value }))}
                    style={{ flex: 1, background: "var(--bg-elevated)", border: "1px solid var(--line-md)", borderRadius: 6, padding: "8px 10px", color: "var(--ink)", fontSize: 13, textAlign: "right", outline: "none" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>点</span>
                  {mockScores[s.id] && !isNaN(Number(mockScores[s.id])) && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sky)", width: 40, textAlign: "right" }}>
                      {Math.round((Number(mockScores[s.id]) / s.maxScore) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(0)} className="btn-sub" style={{ padding: "12px 16px" }}>← 戻る</button>
            <button onClick={() => setStep(2)} className="btn-main" style={{ flex: 1 }}>次へ →</button>
          </div>
          <button onClick={() => setStep(2)} style={{ marginTop: 10, fontSize: 12, color: "var(--ink-muted)", background: "none", border: "none", cursor: "pointer", textAlign: "center", width: "100%" }}>スキップ</button>
        </div>
      )}

      {/* ─── Step 2: 自己評価 ─── */}
      {step === 2 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", marginBottom: 4 }}>各科目の自己評価</div>
          <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 16 }}>今の感覚で正直に選んでください。</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16, flex: 1 }}>
            {subjects.map((s) => (
              <div key={s.id}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>{s.name}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
                  {SELF_LEVELS.map((level) => {
                    const active = selfAssessment[s.id] === level.value;
                    return (
                      <button
                        key={level.value}
                        onClick={() => setSelfAssessment((p) => ({ ...p, [s.id]: level.value }))}
                        style={{
                          padding: "8px 4px", borderRadius: 8, textAlign: "center", cursor: "pointer",
                          border: `1.5px solid ${active ? "var(--sky)" : "var(--line-md)"}`,
                          background: active ? "rgba(74,143,168,0.1)" : "var(--bg-card)",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ fontSize: 10, fontWeight: 700, color: active ? "var(--sky)" : "var(--ink-muted)" }}>{level.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(hasMockScore ? 1 : 0)} className="btn-sub" style={{ padding: "12px 16px" }}>← 戻る</button>
            <button onClick={() => setStep(3)} disabled={!subjects.every((s) => selfAssessment[s.id] !== undefined)} className="btn-main" style={{ flex: 1, opacity: !subjects.every((s) => selfAssessment[s.id] !== undefined) ? 0.4 : 1 }}>次へ →</button>
          </div>
        </div>
      )}

      {/* ─── Step 3: 苦手論点 ─── */}
      {step === 3 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", marginBottom: 4 }}>苦手な論点を選ぶ</div>
          <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 12 }}>「苦手かも」と思う論点にチェックを入れてください（任意）。</div>

          <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSubjectForWeak(s.id)}
                style={{
                  flexShrink: 0, padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  background: selectedSubjectForWeak === s.id ? "var(--ink)" : "var(--bg-elevated)",
                  color: selectedSubjectForWeak === s.id ? "#FAF9F6" : "var(--ink-muted)",
                  border: selectedSubjectForWeak === s.id ? "none" : "1px solid var(--line-md)",
                }}
              >
                {s.shortName}
                {s.topics.some((t) => weakTopicIds.has(t.id)) && (
                  <span style={{ marginLeft: 4, color: "var(--terra)" }}>{s.topics.filter((t) => weakTopicIds.has(t.id)).length}</span>
                )}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
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
                  style={{
                    textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                    border: `1.5px solid ${checked ? "var(--terra)" : "var(--line-md)"}`,
                    background: checked ? "var(--terra-light)" : "var(--bg-card)",
                    display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    border: `2px solid ${checked ? "var(--terra)" : "var(--line-md)"}`,
                    background: checked ? "var(--terra)" : "transparent",
                  }}>
                    {checked && <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: checked ? "var(--terra)" : "var(--ink)" }}>{topic.name}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-muted)", marginTop: 1 }}>{"★".repeat(topic.weight)}{"☆".repeat(5 - topic.weight)}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {weakTopicIds.size > 0 && (
            <div style={{ textAlign: "center", fontSize: 12, color: "var(--ink-muted)", marginBottom: 10 }}>
              {weakTopicIds.size} 論点を苦手として登録
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(2)} className="btn-sub" style={{ padding: "12px 16px" }}>← 戻る</button>
            {previewMode ? (
              <button onClick={onClose} className="btn-sub" style={{ flex: 1 }}>✕ プレビューを終了</button>
            ) : (
              <button onClick={handleComplete} className="btn-main" style={{ flex: 1 }}>学習を始める</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
