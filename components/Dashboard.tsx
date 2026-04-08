"use client";

import { useState } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { AppState } from "@/lib/types";
import { getSubjects } from "@/lib/examData";
import { calcMasteryScore, calcCoverageScore, calcPassProbability } from "@/lib/storage";
import { ArrowLeft, PenLine, Map, BookOpen } from "lucide-react";

interface Props {
  state: AppState;
  onNavigate: (page: "heatmap" | "record" | "natural") => void;
  onBack?: () => void;
}

const getDaysUntil = (dateStr: string): number => {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const shortenTopicName = (name: string): string => {
  const base = name.replace(/（[^）]*）/g, "").replace(/\([^)]*\)/g, "").trim();
  return base.length > 8 ? base.slice(0, 7) + "…" : base;
};

const probColor = (s: number) =>
  s >= 70 ? "var(--sage)" : s >= 50 ? "var(--amber)" : s >= 30 ? "var(--terra)" : "#B04A35";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--line-md)",
      borderRadius: 8, padding: "8px 12px", fontSize: 12,
      boxShadow: "var(--shadow-card)",
    }}>
      <div style={{ color: "var(--ink)", fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {p.value}%</div>
      ))}
    </div>
  );
};

/* ── Section label ── */
const SL = ({ children, color }: { children: string; color: string }) => (
  <div style={{
    fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: "0.15em", color, marginBottom: 10,
  }}>{children}</div>
);

export default function Dashboard({ state, onNavigate, onBack }: Props) {
  const { examConfig, topicProgress } = state;
  if (!examConfig) return null;

  const subjects        = getSubjects(examConfig.type);
  const passProbability = calcPassProbability(topicProgress, subjects);
  const daysLeft        = getDaysUntil(examConfig.examDate);
  const [activeSubjectId, setActiveSubjectId] = useState(subjects[0].id);

  const activeSubject = subjects.find((s) => s.id === activeSubjectId)!;

  const topicRadarData = activeSubject.topics.map((t) => ({
    topic:   shortenTopicName(t.name),
    fullName: t.name,
    習熟度:  topicProgress[t.id]?.proficiency ?? 0,
    カバー率: (topicProgress[t.id]?.studyCount ?? 0) > 0 ? 100 : 0,
  }));

  const subjectSummary = subjects.map((s) => ({
    id:        s.id,
    name:      s.name,
    shortName: s.shortName,
    mastery:   calcMasteryScore(topicProgress, s.topics),
    coverage:  calcCoverageScore(topicProgress, s.topics),
  }));

  const recentRecords = state.studyRecords.filter(
    (r) => (Date.now() - new Date(r.date).getTime()) / 86400000 <= 7
  ).length;

  const daysColor = daysLeft <= 30 ? "var(--terra)" : daysLeft <= 90 ? "var(--amber)" : "var(--ink)";
  const pc = probColor(passProbability);

  /* ── カード共通 ── */
  const card: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1.5px solid var(--line-md)",
    borderRadius: 10,
    boxShadow: "var(--shadow-card)",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>

      {/* ── ヘッダー ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onBack && (
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
              <ArrowLeft size={18} strokeWidth={1.6} color="var(--ink-muted)" />
            </button>
          )}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: 2 }}>
              {examConfig.label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: daysColor }}>
              {daysLeft > 0 ? `本番まで ${daysLeft} 日` : daysLeft === 0 ? "本日試験日" : "試験終了"}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, color: "var(--ink-muted)", marginBottom: 2 }}>直近7日</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--sky)", fontFamily: "var(--font-en)" }}>{recentRecords}<span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-muted)", marginLeft: 2 }}>件</span></div>
        </div>
      </div>

      <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* ── 合格可能性 ── */}
        <div style={{ ...card, padding: "18px 20px" }}>
          <SL color="var(--ink-muted)">合格可能性</SL>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em", color: pc, fontFamily: "var(--font-en)", flexShrink: 0 }}>
              {passProbability}<span style={{ fontSize: 20, fontWeight: 500, color: "var(--ink-faint)" }}>%</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 8, borderRadius: 4, background: "var(--bg-elevated)", overflow: "hidden", marginBottom: 6 }}>
                <div style={{ height: "100%", borderRadius: 4, width: `${passProbability}%`, background: pc, transition: "width 0.7s ease" }} />
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-muted)", textAlign: "right" }}>合格ライン 70%</div>
            </div>
          </div>
        </div>

        {/* ── 科目別サマリー ── */}
        <div style={{ ...card, padding: "18px 20px" }}>
          <SL color="var(--ink-muted)">科目別サマリー</SL>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {subjectSummary.map((s) => (
              <div key={s.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>{s.name}</span>
                  <span style={{ color: "var(--ink-muted)" }}>
                    習熟度 <span style={{ color: probColor(s.mastery), fontWeight: 700 }}>{s.mastery}%</span>
                    <span style={{ margin: "0 6px", color: "var(--ink-faint)" }}>|</span>
                    カバー <span style={{ color: "var(--sage)", fontWeight: 700 }}>{s.coverage}%</span>
                  </span>
                </div>
                <div style={{ position: "relative", height: 8, background: "var(--bg-elevated)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: "0 auto 0 0", width: `${s.coverage}%`, background: "rgba(106,158,127,0.35)", borderRadius: 4 }} />
                  <div style={{ position: "absolute", inset: "0 auto 0 0", width: `${s.mastery}%`, background: probColor(s.mastery), borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 11, color: "var(--ink-muted)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 12, height: 6, borderRadius: 3, background: "var(--sky)" }} />習熟度
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 12, height: 6, borderRadius: 3, background: "rgba(106,158,127,0.35)" }} />カバー率
            </div>
          </div>
        </div>

        {/* ── レーダーチャート ── */}
        <div style={{ ...card, padding: "18px 20px" }}>
          <SL color="var(--ink-muted)">論点別レーダーチャート</SL>

          {/* 科目タブ */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSubjectId(s.id)}
                style={{
                  flexShrink: 0, padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: activeSubjectId === s.id ? "var(--ink)" : "var(--bg-elevated)",
                  color: activeSubjectId === s.id ? "#FAF9F6" : "var(--ink-muted)",
                  border: activeSubjectId === s.id ? "none" : "1px solid var(--line-md)",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                {s.shortName}
              </button>
            ))}
          </div>

          {/* 凡例 */}
          <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--ink-muted)", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 12, height: 2, background: "var(--sky)", borderRadius: 1 }} />習熟度
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 12, height: 2, background: "var(--sage)", borderRadius: 1 }} />カバー率
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={topicRadarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="var(--line-md)" />
              <PolarAngleAxis dataKey="topic" tick={{ fill: "var(--ink-muted)", fontSize: 10 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "var(--ink-faint)", fontSize: 8 }} tickCount={4} />
              <Radar name="カバー率" dataKey="カバー率" stroke="var(--sage)" fill="var(--sage)" fillOpacity={0.12} strokeWidth={1.5} />
              <Radar name="習熟度"  dataKey="習熟度"  stroke="var(--sky)"  fill="var(--sky)"  fillOpacity={0.2}  strokeWidth={2} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>

          {/* 論点スコア一覧 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 12 }}>
            {activeSubject.topics.map((t) => {
              const p       = topicProgress[t.id];
              const mastery = p?.proficiency ?? 0;
              const studied = (p?.studyCount ?? 0) > 0;
              return (
                <div key={t.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", background: "var(--bg-elevated)",
                  border: "1px solid var(--line)", borderRadius: 8, fontSize: 12,
                }}>
                  <span style={{ color: studied ? "var(--ink)" : "var(--ink-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 6 }}>
                    {t.name.length > 10 ? t.name.slice(0, 9) + "…" : t.name}
                  </span>
                  <span style={{ fontWeight: 700, flexShrink: 0, color: studied ? probColor(mastery) : "var(--ink-faint)" }}>
                    {studied ? `${mastery}%` : "−"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ギャップ警告 ── */}
        {subjectSummary.some((s) => s.coverage > 30 && s.mastery < s.coverage - 30) && (
          <div style={{
            ...card,
            padding: "14px 16px",
            background: "var(--amber-light)",
            border: "1.5px solid var(--amber-border)",
          }}>
            <span style={{ fontWeight: 700, color: "var(--amber)" }}>⚠ ギャップあり: </span>
            <span style={{ fontSize: 13, color: "var(--ink)" }}>
              {subjectSummary.filter((s) => s.coverage > 30 && s.mastery < s.coverage - 30).map((s) => s.shortName).join("・")}
              — やったが定着していない可能性
            </span>
          </div>
        )}

        {/* ── アクションボタン ── */}
        <button
          onClick={() => onNavigate("natural")}
          className="btn-main"
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <PenLine size={14} strokeWidth={2} />
          今日の学習を記録する
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={() => onNavigate("heatmap")} className="btn-sub" style={{ padding: "14px", textAlign: "left" }}>
            <Map size={16} strokeWidth={1.4} color="var(--ink-muted)" style={{ marginBottom: 6 }} />
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>論点ヒートマップ</div>
            <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>習熟度を確認</div>
          </button>
          <button onClick={() => onNavigate("record")} className="btn-sub" style={{ padding: "14px", textAlign: "left" }}>
            <BookOpen size={16} strokeWidth={1.4} color="var(--ink-muted)" style={{ marginBottom: 6 }} />
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>詳細記録</div>
            <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>論点を選んで入力</div>
          </button>
        </div>

      </div>
    </div>
  );
}
