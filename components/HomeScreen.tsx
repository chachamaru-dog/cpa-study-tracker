"use client";

import { useState } from "react";
import { AppState, STUDY_METHOD_META, StudyMethod } from "@/lib/types";
import { getSubjects } from "@/lib/examData";
import {
  generateTodayTasks,
  getReviewAlerts,
  calcIORate,
  calcAvgConcentration,
} from "@/lib/forgettingCurve";
import { BookOpen, PenLine, ScrollText, CalendarDays, BarChart3, ChevronDown } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RechartTooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";

interface Props {
  state: AppState;
  onNavigate: (page: "heatmap" | "record" | "natural" | "dashboard" | "mockexam" | "settings") => void;
}

const getDaysUntil = (d: string) => {
  const t = new Date(d), n = new Date(); n.setHours(0,0,0,0);
  return Math.ceil((t.getTime() - n.getTime()) / 86400000);
};

/* ── Growing Tree ────────────────────────────────────────── */
// daysLeft が少ないほど木が成長する（試験日に満開）
const GrowingTree = ({ daysLeft }: { daysLeft: number }) => {
  const stage = daysLeft > 180 ? 0 : daysLeft > 90 ? 1 : daysLeft > 45 ? 2 : daysLeft > 14 ? 3 : 4;
  const trunk  = "#92400E";
  const greens = ["#A8D4BC", "#84B898", "#6A9E7F", "#52836A", "#3D6B55"];
  const g      = greens[stage];
  const g2     = stage > 0 ? greens[stage - 1] : greens[0];

  return (
    <svg width="44" height="56" viewBox="0 0 44 56" fill="none">
      {/* 地面 */}
      <ellipse cx="22" cy="53" rx="10" ry="2" fill={trunk} opacity="0.18" />

      {stage === 0 && ( // 芽
        <>
          <line x1="22" y1="52" x2="22" y2="44" stroke={g} strokeWidth="2" strokeLinecap="round" />
          <path d="M22 47 Q17 43 19 39 Q22 43 22 47" fill={g} />
          <path d="M22 47 Q27 43 25 39 Q22 43 22 47" fill={g2} opacity="0.8" />
        </>
      )}
      {stage === 1 && ( // 若木
        <>
          <rect x="20" y="42" width="4" height="11" rx="2" fill={trunk} opacity="0.8" />
          <ellipse cx="22" cy="37" rx="9" ry="10" fill={g} opacity="0.9" />
          <path d="M22 44 Q13 38 16 28 Q22 34 22 44" fill={g2} opacity="0.6" />
          <path d="M22 44 Q31 38 28 28 Q22 34 22 44" fill={g} opacity="0.7" />
        </>
      )}
      {stage === 2 && ( // 小木
        <>
          <rect x="19" y="38" width="6" height="15" rx="2.5" fill={trunk} opacity="0.85" />
          <ellipse cx="22" cy="30" rx="12" ry="13" fill={g} opacity="0.9" />
          <path d="M22 41 Q10 33 13 20 Q22 28 22 41" fill={g2} opacity="0.55" />
          <path d="M22 41 Q34 33 31 20 Q22 28 22 41" fill={g} opacity="0.6" />
          <path d="M22 35 Q14 30 16 22 Q22 27 22 35" fill={g2} opacity="0.4" />
        </>
      )}
      {stage === 3 && ( // 中木
        <>
          <rect x="18" y="34" width="8" height="19" rx="3" fill={trunk} opacity="0.85" />
          <ellipse cx="22" cy="22" rx="14" ry="16" fill={g} opacity="0.9" />
          <path d="M22 38 Q8 28 12 12 Q22 22 22 38" fill={g2} opacity="0.55" />
          <path d="M22 38 Q36 28 32 12 Q22 22 22 38" fill={g} opacity="0.6" />
          <path d="M22 30 Q13 24 15 14 Q22 20 22 30" fill={g2} opacity="0.45" />
          <path d="M22 30 Q31 24 29 14 Q22 20 22 30" fill={g} opacity="0.45" />
          <ellipse cx="22" cy="15" rx="7" ry="6" fill={g2} opacity="0.5" />
        </>
      )}
      {stage === 4 && ( // 大木
        <>
          <rect x="17" y="30" width="10" height="23" rx="3.5" fill={trunk} opacity="0.85" />
          <ellipse cx="22" cy="17" rx="16" ry="18" fill={g} opacity="0.9" />
          <path d="M22 34 Q6 22 10 4 Q22 16 22 34" fill={g2} opacity="0.55" />
          <path d="M22 34 Q38 22 34 4 Q22 16 22 34" fill={g} opacity="0.6" />
          <path d="M22 26 Q11 18 14 6 Q22 14 22 26" fill={g2} opacity="0.45" />
          <path d="M22 26 Q33 18 30 6 Q22 14 22 26" fill={g} opacity="0.45" />
          <ellipse cx="22" cy="9" rx="9" ry="8" fill={g2} opacity="0.55" />
          <ellipse cx="14" cy="16" rx="6" ry="5" fill={g} opacity="0.4" />
          <ellipse cx="30" cy="16" rx="6" ry="5" fill={g2} opacity="0.4" />
        </>
      )}
    </svg>
  );
};

/* ── Decorative SVG ──────────────────────────────────────── */
const PlantIllustration = () => (
  <svg width="44" height="56" viewBox="0 0 44 56" fill="none" opacity="0.45">
    <path d="M12 38 L14 52 L30 52 L32 38 Z" fill="#BC6C4F" opacity="0.7" />
    <rect x="10" y="36" width="24" height="4" rx="2" fill="#C87A5E" opacity="0.7" />
    <ellipse cx="22" cy="38" rx="11" ry="2.5" fill="#92400E" opacity="0.25" />
    <path d="M22 36 L22 20" stroke="#6A9E7F" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M22 28 Q14 22 16 14 Q22 18 22 28" fill="#6A9E7F" opacity="0.8" />
    <path d="M22 24 Q30 18 28 10 Q22 14 22 24" fill="#84B898" opacity="0.8" />
    <path d="M22 32 Q12 30 13 22 Q20 26 22 32" fill="#52836A" opacity="0.6" />
  </svg>
);

/* ── Section label ───────────────────────────────────────── */
const SL = ({ children, color }: { children: string; color: string }) => (
  <div className="sec-label" style={{ color }}>{children}</div>
);

/* ── Priority badge ──────────────────────────────────────── */
const Badge = ({ type }: { type: "high" | "medium" }) => (
  <span style={{
    fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
    color: type === "high" ? "#BC6C4F" : "#C49A2B",
    background: type === "high" ? "var(--terra-light)" : "var(--amber-light)",
    border: `1px solid ${type === "high" ? "var(--terra-border)" : "var(--amber-border)"}`,
    borderRadius: 4, padding: "2px 7px",
  }}>
    {type === "high" ? "優先" : "推奨"}
  </span>
);

/* ══════════════════════════════════════════════════════════ */

export default function HomeScreen({ state, onNavigate }: Props) {
  const { examConfig } = state;
  if (!examConfig) return null;

  const subjects     = getSubjects(examConfig.type);
  const daysLeft     = getDaysUntil(examConfig.examDate);
  const todayTasks   = generateTodayTasks(subjects, state);
  const reviewAlerts = getReviewAlerts(subjects, state).slice(0, 1);
  const ioRate       = calcIORate(state);
  const avgConc      = calcAvgConcentration(state, 7);

  const daysColor = daysLeft <= 30 ? "#BC6C4F" : daysLeft <= 90 ? "#C49A2B" : "#334155";
  const totalIO   = ioRate.inputCount + ioRate.outputCount;
  const [ioOpen,   setIoOpen]   = useState<"input" | "output" | null>(null);
  const [concOpen, setConcOpen] = useState(false);

  const showReview = reviewAlerts.length > 0;
  const showConc   = avgConc !== null;

  /* ── 直近7日間の集中度データ ── */
  const concChartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setHours(0,0,0,0);
    d.setDate(d.getDate() - (6 - i));
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const recs = state.studyRecords.filter(r => {
      const rd = new Date(r.date); rd.setHours(0,0,0,0);
      return rd.getTime() === d.getTime() && r.concentration != null;
    });
    const avg = recs.length > 0
      ? Math.round(recs.reduce((s, r) => s + (r.concentration ?? 0), 0) / recs.length * 10) / 10
      : null;
    return { date: label, value: avg };
  });

  /* ── カード共通スタイル（アイボリー） ── */
  const card = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: "var(--bg-card)",
    border: "1.5px solid var(--line-md)",
    ...extra,
  });

  return (
    <div style={{ minHeight: "100vh", maxWidth: 480, margin: "0 auto", paddingBottom: 140, background: "var(--bg)" }}>

      {/* ── Nav ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 20px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <BookOpen size={13} strokeWidth={1.4} color="var(--ink-muted)" />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
            {examConfig.label}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onNavigate("dashboard")} className="btn-sub" style={{ padding: "4px 11px", fontSize: 11 }}>
            詳細
          </button>
          <button onClick={() => onNavigate("settings")} className="btn-sub" style={{ padding: "4px 10px", fontSize: 14 }}>
            ⚙
          </button>
        </div>
      </div>

      {/* ── BENTO GRID ── */}
      <div style={{ padding: "0 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* TODAY — 全幅・アイボリー */}
        <div className="sticky" style={{ ...card({ gridColumn: "span 2", padding: "20px 20px 18px" }) }}>

          {/* ヘッダー：タイトル左・木＋本番まで右 */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 4 }}>
              <CalendarDays size={12} strokeWidth={1.4} color="var(--amber)" />
              <SL color="var(--amber)">今日のタスク</SL>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
              <GrowingTree daysLeft={Math.max(0, daysLeft)} />
              <div style={{ textAlign: "right", paddingBottom: 4 }}>
                <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-muted)", marginBottom: 2 }}>
                  本番まで
                </div>
                <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.05em", color: daysColor, fontFamily: "var(--font-en)" }}>
                  {Math.max(0, daysLeft)}<span style={{ fontSize: 22, fontWeight: 500, color: "var(--ink-faint)", marginLeft: 2 }}>日</span>
                </div>
              </div>
            </div>
          </div>

          {/* タスクリスト */}
          {todayTasks.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>今日のタスクはありません</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {todayTasks.map((task) => {
                const isHigh = task.priority === "high";
                return (
                  <button
                    key={task.id}
                    onClick={() => onNavigate("record")}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "12px 14px",
                      background: isHigh ? "rgba(188,108,79,0.07)" : "rgba(196,154,43,0.07)",
                      border: `1.5px solid ${isHigh ? "var(--terra-border)" : "var(--amber-border)"}`,
                      borderLeft: `4px solid ${isHigh ? "var(--terra)" : "var(--amber)"}`,
                      borderRadius: 8, cursor: "pointer", textAlign: "left",
                      transition: "opacity 0.2s",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ marginBottom: 4 }}><Badge type={isHigh ? "high" : "medium"} /></div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {task.topicName}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{task.subjectName}</div>
                    </div>
                    <PenLine size={15} strokeWidth={1.6} color={isHigh ? "var(--terra)" : "var(--amber)"} style={{ marginLeft: 10, flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* REVIEW — 横長・全幅 */}
        {showReview && reviewAlerts.map(alert => {
          const rc = alert.retention < 30 ? "var(--terra)" : "var(--amber)";
          return (
            <div key={alert.topicId} className="sticky"
              style={{ ...card({ gridColumn: "span 2", padding: "14px 18px" }) }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <ScrollText size={11} strokeWidth={1.4} color={rc} />
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: rc }}>
                    そろそろ忘れてない?
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "55%" }}>
                  {alert.topicName}
                </div>
              </div>
            </div>
          );
        })}

        {/* CONCENTRATION — 横長・全幅・タップで折れ線グラフ */}
        {showConc && avgConc !== null && (
          <div className="sticky"
            style={{ ...card({ gridColumn: "span 2", padding: "14px 18px" }) }}>
            <button
              onClick={() => setConcOpen(o => !o)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <BarChart3 size={11} strokeWidth={1.4} color="var(--sage)" />
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "var(--sage)" }}>
                  直近7日間の集中度
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{ width: 18, height: 6, borderRadius: 3, background: i <= Math.round(avgConc) ? "var(--sage)" : "var(--bg-elevated)" }} />
                  ))}
                </div>
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--sage)", fontFamily: "var(--font-en)", lineHeight: 1 }}>
                  {avgConc}<span style={{ fontSize: 11, fontWeight: 400, color: "var(--ink-muted)" }}>/5</span>
                </span>
                <ChevronDown size={13} strokeWidth={1.6} color="var(--ink-faint)"
                  style={{ transition: "transform 0.25s", transform: concOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
              </div>
            </button>

            {concOpen && (
              <div style={{ marginTop: 16 }}>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={concChartData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                    <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--ink-muted)" }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 10, fill: "var(--ink-muted)" }} tickLine={false} axisLine={false} />
                    <ReferenceLine y={3} stroke="var(--sage-border)" strokeDasharray="4 4" />
                    <RechartTooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => v != null ? [`${v} / 5`, "集中度"] : ["記録なし", "集中度"]}
                      labelFormatter={(l) => l}
                      contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--line-md)", borderRadius: 8, fontSize: 12 }}
                    />
                    <Line
                      type="monotone" dataKey="value"
                      stroke="var(--sage)" strokeWidth={2}
                      dot={{ fill: "var(--sage)", r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* I/O RATIO — アイボリー */}
        <div className="sticky"
          style={{ ...card({ gridColumn: "span 2", padding: "18px 18px 16px" }) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 12 }}>
            <BarChart3 size={11} strokeWidth={1.4} color="var(--lavender)" />
            <SL color="var(--lavender)">学習バランス · 30日</SL>
          </div>
          {totalIO === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>記録がまだありません</p>
          ) : (
            <>
              <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "var(--bg-elevated)", marginBottom: 8 }}>
                {ioRate.inputRate > 0 && <div style={{ width: `${ioRate.inputRate}%`, background: "var(--lavender)" }} />}
                {ioRate.outputRate > 0 && <div style={{ width: `${ioRate.outputRate}%`, background: "var(--sage)" }} />}
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: ioOpen ? 14 : 0 }}>
                {(["input", "output"] as const).map((type) => {
                  const isInput = type === "input";
                  const rate    = isInput ? ioRate.inputRate : ioRate.outputRate;
                  const color   = isInput ? "var(--lavender)" : "var(--sage)";
                  const isOpen  = ioOpen === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setIoOpen(isOpen ? null : type)}
                      style={{
                        flex: 1, padding: "8px 10px",
                        background: isOpen
                          ? (isInput ? "rgba(124,111,160,0.1)" : "rgba(106,158,127,0.1)")
                          : "var(--bg-elevated)",
                        border: `1.5px solid ${isOpen ? color : "var(--line-md)"}`,
                        borderRadius: 6, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        transition: "all 0.25s ease",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color }}>{isInput ? "インプット" : "アウトプット"}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "var(--font-en)" }}>{rate}%</span>
                    </button>
                  );
                })}
              </div>

              {ioOpen && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 4 }}>
                  {(Object.entries(STUDY_METHOD_META) as [StudyMethod, typeof STUDY_METHOD_META[StudyMethod]][])
                    .filter(([, meta]) => meta.type === ioOpen)
                    .map(([method, meta]) => {
                      const w     = Math.round((ioRate.byMethod[method] ?? 0) * 10) / 10;
                      const color = ioOpen === "input" ? "var(--lavender)" : "var(--sage)";
                      return (
                        <div key={method} style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--line)",
                          borderRadius: 6, padding: "10px 6px", textAlign: "center",
                          opacity: w > 0 ? 1 : 0.4,
                        }}>
                          <div style={{ fontSize: 16, marginBottom: 4 }}>{meta.icon}</div>
                          <div style={{ fontSize: 9, color: "var(--ink-muted)", lineHeight: 1.3, marginBottom: 5 }}>{meta.label}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: w > 0 ? color : "var(--ink-faint)" }}>
                            {w > 0 ? `${w}h` : "—"}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </div>

        {/* 装飾: 右下に観葉植物 */}
        <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end", paddingRight: 8, paddingTop: 4 }}>
          <PlantIllustration />
        </div>

      </div>{/* end bento */}

      {/* ── Fixed footer ── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(250,249,246,0.94)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid var(--line)",
        padding: "14px 16px 28px",
        zIndex: 50,
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => onNavigate("natural")} className="btn-main" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <PenLine size={14} strokeWidth={2} />
            今日の学習を記録する
          </button>
          <button onClick={() => onNavigate("mockexam")} className="btn-sub" style={{ width: "100%" }}>
            答練や模試を受けたら入力してね
          </button>
        </div>
      </div>
    </div>
  );
}
