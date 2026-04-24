"use client";

import { useState } from "react";
import { AppState, MockExamRecord, TopicProgress } from "@/lib/types";
import { getSubjects } from "@/lib/examData";
import { Subject } from "@/lib/types";
import { ArrowLeft, FileText, ClipboardList, ScrollText } from "lucide-react";

interface Props {
  state:  AppState;
  onSave: (newProgress: Record<string, TopicProgress>, mockRecord: MockExamRecord) => void;
  onBack: () => void;
}

const EXAM_TYPES: {
  id: "touren" | "moshi" | "honshiken";
  label: string;
  sub: string;
  blend: number;
  Icon: React.FC<{ size?: number; strokeWidth?: number; color?: string }>;
}[] = [
  { id: "touren",    label: "答練",          sub: "模擬問題演習",     blend: 0.55, Icon: FileText     },
  { id: "moshi",     label: "模試",          sub: "本番形式テスト",   blend: 0.65, Icon: ClipboardList },
  { id: "honshiken", label: "本試験・過去問", sub: "最も信頼性が高い", blend: 0.75, Icon: ScrollText   },
];

const probColor = (pct: number) =>
  pct >= 70 ? "var(--sage)" : pct >= 55 ? "var(--amber)" : "var(--terra)";

// 答練・模試の表示用科目リスト（財務計算＋理論を200点1科目に統合）
type DisplaySubject = { id: string; name: string; maxScore: number; realIds: string[] };
const buildDisplaySubjects = (subjects: Subject[]): DisplaySubject[] => {
  const result: DisplaySubject[] = [];
  let financialMerged = false;
  for (const s of subjects) {
    if (s.id === "financial_calc" || s.id === "financial_theory") {
      if (!financialMerged) {
        result.push({
          id: "financial_combined",
          name: "財務会計論（計算＋理論）",
          maxScore: 200,
          realIds: ["financial_calc", "financial_theory"],
        });
        financialMerged = true;
      }
    } else {
      result.push({ id: s.id, name: s.name, maxScore: s.maxScore, realIds: [s.id] });
    }
  }
  return result;
};

const applyMockScores = (
  subjects: Subject[],
  prevProgress: Record<string, TopicProgress>,
  // scoreMap は displayId → 取得点
  displayScoreMap: Record<string, number>,
  blend: number,
): Record<string, TopicProgress> => {
  // combined財務を各100点満点に分解（50/50）
  const scoreMap: Record<string, number> = { ...displayScoreMap };
  if (displayScoreMap["financial_combined"] !== undefined) {
    const half = displayScoreMap["financial_combined"] / 2;
    scoreMap["financial_calc"]   = half;
    scoreMap["financial_theory"] = half;
    delete scoreMap["financial_combined"];
  }

  const result = { ...prevProgress };
  for (const subject of subjects) {
    const rawScore = scoreMap[subject.id];
    if (rawScore === undefined) continue;
    const newBasePct = Math.round((rawScore / subject.maxScore) * 100);
    const avgWeight  = subject.topics.reduce((s, t) => s + t.weight, 0) / subject.topics.length;
    for (const topic of subject.topics) {
      const prev    = prevProgress[topic.id];
      const prevPct = prev?.proficiency ?? 0;
      const bonus   = Math.round((topic.weight - avgWeight) * 2.5);
      const newPct  = Math.max(0, Math.min(100, newBasePct + bonus));
      const blended = prev
        ? Math.round(blend * newPct + (1 - blend) * prevPct)
        : newPct;
      const newCount = Math.max((prev?.studyCount ?? 0), 1);
      result[topic.id] = {
        topicId:      topic.id,
        proficiency:  blended,
        correctCount: Math.round((blended / 100) * newCount),
        wrongCount:   newCount - Math.round((blended / 100) * newCount),
        studyCount:   newCount,
        weakFlag:     prev?.weakFlag ?? false,
        lastStudied:  new Date().toISOString(),
      };
    }
  }
  return result;
};

export default function MockExamInput({ state, onSave, onBack }: Props) {
  const { examConfig } = state;
  if (!examConfig) return null;

  const subjects        = getSubjects(examConfig.type);
  const displaySubjects = buildDisplaySubjects(subjects);
  const [examType, setExamType] = useState<"touren" | "moshi" | "honshiken">("touren");
  const [scores,   setScores]   = useState<Record<string, string>>({});
  const [saved,    setSaved]    = useState(false);

  const currentType = EXAM_TYPES.find(t => t.id === examType)!;

  const handleScore = (subjectId: string, val: string) => {
    setScores(prev => ({ ...prev, [subjectId]: val }));
  };

  const hasAnyScore = Object.values(scores).some(v => v !== "" && !isNaN(Number(v)) && Number(v) >= 0);

  const handleSave = () => {
    const displayScoreMap: Record<string, number> = {};
    const pctMap: Record<string, number> = {};
    for (const ds of displaySubjects) {
      const val = scores[ds.id];
      if (val !== undefined && val !== "" && !isNaN(Number(val))) {
        const raw = Math.min(Number(val), ds.maxScore);
        displayScoreMap[ds.id] = raw;
        pctMap[ds.id]          = Math.round((raw / ds.maxScore) * 100);
      }
    }
    const newProgress = applyMockScores(subjects, state.topicProgress, displayScoreMap, currentType.blend);
    const mockRecord: MockExamRecord = {
      id:     `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type:   examType,
      date:   new Date().toISOString(),
      scores: displayScoreMap,
      pcts:   pctMap,
    };
    onSave(newProgress, mockRecord);
    setSaved(true);
    setTimeout(() => { setSaved(false); onBack(); }, 1400);
  };

  /* ── 保存完了画面 ── */
  if (saved) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
      }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--sage)", opacity: 0.2 }} />
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginTop: -44 }}>反映しました</div>
        <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>合格可能性の計算に反映されます</div>
      </div>
    );
  }

  const card: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1.5px solid var(--line-md)",
    borderRadius: 12,
    boxShadow: "var(--shadow-card)",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", maxWidth: 480, margin: "0 auto", paddingBottom: 120 }}>

      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "22px 20px 18px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          <ArrowLeft size={18} strokeWidth={1.6} color="var(--ink-muted)" />
        </button>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: 2 }}>
            成績の記録
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>答練・模試を入力</div>
        </div>
      </div>

      <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* 試験種別タブ */}
        <div style={{ ...card, padding: "16px 18px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-muted)", marginBottom: 12 }}>
            試験の種類
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {EXAM_TYPES.map(t => {
              const active = examType === t.id;
              return (
                <button key={t.id} onClick={() => setExamType(t.id)}
                  style={{
                    padding: "12px 8px", borderRadius: 10, textAlign: "center", cursor: "pointer",
                    background: active ? "var(--ink)" : "var(--bg-elevated)",
                    border: `1.5px solid ${active ? "var(--ink)" : "var(--line-md)"}`,
                    transition: "all 0.2s",
                  }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                    <t.Icon size={14} strokeWidth={1.4} color={active ? "#FAF9F6" : "var(--ink-muted)"} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: active ? "#FAF9F6" : "var(--ink)", marginBottom: 2 }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: 9, color: active ? "rgba(250,249,246,0.65)" : "var(--ink-muted)", lineHeight: 1.3 }}>
                    {t.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 科目別点数入力 */}
        <div style={{ ...card, padding: "16px 18px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-muted)", marginBottom: 14 }}>
            各科目の点数
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {displaySubjects.map((ds, idx) => {
              const val    = scores[ds.id] ?? "";
              const numVal = val !== "" && !isNaN(Number(val)) ? Number(val) : null;
              const pct    = numVal !== null ? Math.round((numVal / ds.maxScore) * 100) : null;
              // 現在の習熟度：対象realIdsに含まれる科目の論点平均
              const relatedTopics = subjects
                .filter(s => ds.realIds.includes(s.id))
                .flatMap(s => s.topics);
              const prevPct = relatedTopics.length > 0
                ? Math.round(relatedTopics.reduce((a, t) => a + (state.topicProgress[t.id]?.proficiency ?? 0), 0) / relatedTopics.length)
                : 0;
              const color = pct !== null ? probColor(pct) : "var(--ink-faint)";

              return (
                <div key={ds.id}>
                  {/* 科目名 + 現在習熟度 */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{ds.name}</span>
                      {ds.id === "financial_combined" && (
                        <span style={{ fontSize: 9, color: "var(--ink-faint)", marginLeft: 6 }}>計算・理論合算</span>
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: "var(--ink-muted)" }}>
                      習熟度 <span style={{ fontWeight: 700, color: "var(--sky)" }}>{prevPct}%</span>
                    </span>
                  </div>

                  {/* 入力行 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="number" min={0} max={ds.maxScore}
                      placeholder={`0 〜 ${ds.maxScore}`}
                      value={val}
                      onChange={e => handleScore(ds.id, e.target.value)}
                      style={{
                        flex: 1, background: "var(--bg-elevated)",
                        border: `1.5px solid ${pct !== null ? color : "var(--line-md)"}`,
                        borderRadius: 8, padding: "10px 12px",
                        fontSize: 16, fontWeight: 700,
                        color: pct !== null ? color : "var(--ink)",
                        textAlign: "right", outline: "none",
                        fontFamily: "var(--font-en)",
                        transition: "border-color 0.2s",
                      }}
                    />
                    <span style={{ fontSize: 12, color: "var(--ink-muted)", flexShrink: 0 }}>/ {ds.maxScore}点</span>
                    {pct !== null && (
                      <span style={{
                        fontSize: 13, fontWeight: 800, color,
                        width: 40, textAlign: "right", flexShrink: 0,
                        fontFamily: "var(--font-en)",
                      }}>{pct}%</span>
                    )}
                  </div>

                  {/* 変化表示 */}
                  {pct !== null && (
                    <div style={{ marginTop: 6, fontSize: 11 }}>
                      {pct > prevPct + 3
                        ? <span style={{ color: "var(--sage)" }}>+{pct - prevPct}% 向上傾向</span>
                        : pct < prevPct - 3
                        ? <span style={{ color: "var(--terra)" }}>−{prevPct - pct}% 要注意</span>
                        : <span style={{ color: "var(--ink-muted)" }}>現状維持</span>}
                      {" · "}
                      <span style={{ color: "var(--ink-faint)" }}>
                        {currentType.blend === 0.75 ? "強め" : currentType.blend === 0.65 ? "中程度" : "控えめ"}に反映
                      </span>
                    </div>
                  )}

                  {/* 仕切り線 */}
                  {idx < displaySubjects.length - 1 && (
                    <div style={{ marginTop: 14, height: 1, background: "var(--line)" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 注記 */}
        <div style={{ fontSize: 11, color: "var(--ink-muted)", lineHeight: 1.7, padding: "0 4px" }}>
          入力した点数をもとに各論点の習熟度を更新します。
          空欄の科目は変更されません。スコアは合格可能性の計算にも直接反映されます。
        </div>

      </div>

      {/* 固定フッターボタン */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(250,249,246,0.94)", backdropFilter: "blur(16px)",
        borderTop: "1px solid var(--line)", padding: "14px 16px 28px", zIndex: 50,
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <button
            onClick={handleSave}
            disabled={!hasAnyScore}
            className="btn-main"
            style={{ width: "100%", opacity: hasAnyScore ? 1 : 0.35, cursor: hasAnyScore ? "pointer" : "not-allowed" }}
          >
            習熟度と合格可能性に反映する
          </button>
        </div>
      </div>
    </div>
  );
}
