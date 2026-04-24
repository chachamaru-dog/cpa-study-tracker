"use client";

import { useState } from "react";
import { AppState, StudyRecord, TopicProgress } from "@/lib/types";
import { getEffectiveSubjects } from "@/lib/examData";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from "recharts";
import { ArrowLeft, MoveRight } from "lucide-react";

interface Props {
  state: AppState;
  onBack: () => void;
  onToggleConfident?: (topicId: string, confident: boolean) => void;
}

// ── エビングハウス忘却曲線 ─────────────────────────────
const stabilityOf = (reviewCount: number) => Math.max(1, reviewCount * 3 + 2);
const retention   = (daysSince: number, reviewCount: number, initial: number = 100) =>
  Math.max(0, Math.round(initial * Math.exp(-daysSince / stabilityOf(reviewCount))));

// ── 論点の曲線データ生成 ──────────────────────────────
const buildCurve = (
  topicId: string,
  records: StudyRecord[],
) => {
  const today = new Date(); today.setHours(0,0,0,0);

  const topicRecs = records
    .filter(r => r.topicId === topicId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (topicRecs.length === 0) return null;

  const eventDates: Date[] = [];
  const seen = new Set<string>();
  for (const r of topicRecs) {
    const d = new Date(r.date); d.setHours(0,0,0,0);
    const key = d.toDateString();
    if (!seen.has(key)) { seen.add(key); eventDates.push(d); }
  }

  const understandingByDay = new Map<string, number>();
  for (const r of topicRecs) {
    const d = new Date(r.date); d.setHours(0,0,0,0);
    const key = d.toDateString();
    const u = r.understanding ?? 100;
    understandingByDay.set(key, Math.max(understandingByDay.get(key) ?? 0, u));
  }

  const firstEvent = eventDates[0];
  const endDate    = new Date(today.getTime() + 28 * 86400000);
  const daysBack   = Math.min(30, Math.floor((today.getTime() - firstEvent.getTime()) / 86400000));
  const startDate  = new Date(firstEvent.getTime() - daysBack * 86400000);

  const data: {
    label: string; dayIndex: number;
    past?: number; future?: number; studyDot?: number;
  }[] = [];

  const cur         = new Date(startDate);
  let anchor        = new Date(firstEvent);
  let reviewCount   = 0;
  let currentInitial = 100; // proficiency依存を廃止・記録ベースのみ

  while (cur <= endDate) {
    const isEvent   = eventDates.some(d => d.toDateString() === cur.toDateString());
    const isPast    = cur <= today;
    const isToday   = cur.toDateString() === today.toDateString();

    if (isEvent && isPast) {
      const key = cur.toDateString();
      currentInitial = understandingByDay.get(key) ?? currentInitial;
      anchor         = new Date(cur);
      reviewCount   += 1;
    }

    const days = Math.max(0, (cur.getTime() - anchor.getTime()) / 86400000);
    const r    = cur < firstEvent ? 0 : retention(days, reviewCount, currentInitial);
    const dayIndex = Math.round((cur.getTime() - startDate.getTime()) / 86400000);

    data.push({
      label:    `${cur.getMonth()+1}/${cur.getDate()}`,
      dayIndex,
      past:     isPast || isToday ? r : undefined,
      future:   !isPast || isToday ? r : undefined,
      studyDot: isEvent && isPast ? currentInitial : undefined,
    });

    cur.setDate(cur.getDate() + 1);
  }

  return { data, reviewCount };
};

// ── 現在の記憶定着率（studyRecords のみ使用・proficiency 非依存） ──
const currentRetention = (topicId: string, studyRecords: StudyRecord[], selfConfident = false): number => {
  const recs = studyRecords
    .filter(r => r.topicId === topicId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (recs.length === 0) return 0;

  const latestMs   = new Date(recs[0].date).getTime();
  const days       = Math.floor((Date.now() - latestMs) / 86400000);
  const latestDay  = new Date(latestMs); latestDay.setHours(0, 0, 0, 0);
  const initial    = Math.max(...recs
    .filter(r => { const d = new Date(r.date); d.setHours(0,0,0,0); return d.toDateString() === latestDay.toDateString(); })
    .map(r => r.understanding ?? 100));
  const reviewCount = new Set(recs.map(r => { const d = new Date(r.date); d.setHours(0,0,0,0); return d.toDateString(); })).size;
  const stability  = Math.max(1, reviewCount * 3 + 2) * (selfConfident ? 2 : 1);
  return Math.max(0, Math.round(initial * Math.exp(-days / stability)));
};

// ── 例示データ ─────────────────────────────────────────
const EXAMPLE_CURVE_DATA = (() => {
  const INITIAL = 80;
  const ret = (daysSince: number, reviewCount: number) =>
    Math.max(0, Math.round(INITIAL * Math.exp(-daysSince / Math.max(1, reviewCount * 3 + 2))));
  const EVENTS = [
    { day: 0,  count: 1, label: "最初の学習" },
    { day: 5,  count: 2, label: "1回目の復習" },
    { day: 13, count: 3, label: "2回目の復習" },
    { day: 24, count: 4, label: "3回目の復習" },
  ];
  const INTERVALS = [5, 8, 11];
  const data = [];
  const SHOW_LABELS = new Set([0, 5, 10, 13, 20, 24, 32, 40]);
  for (let d = 0; d <= 42; d++) {
    let activeEvent = EVENTS[0];
    for (const e of EVENTS) { if (d >= e.day) activeEvent = e; }
    const r = ret(d - activeEvent.day, activeEvent.count);
    data.push({ label: SHOW_LABELS.has(d) ? `${d}日` : "", day: d, retention: r, event: EVENTS.some(e => e.day === d) ? r : undefined });
  }
  return { points: data, events: EVENTS, intervals: INTERVALS };
})();

// ── 経過日数ヘルパー ──────────────────────────────────
const getDaysSince = (topicId: string, studyRecords: { topicId: string; date: string }[]): number | null => {
  const recs = studyRecords.filter(r => r.topicId === topicId);
  if (recs.length === 0) return null;
  const latest = Math.max(...recs.map(r => new Date(r.date).getTime()));
  return Math.floor((Date.now() - latest) / 86400000);
};

const dayColor = (days: number | null): { bg: string; text: string } => {
  if (days === null) return { bg: "var(--bg-elevated)", text: "var(--ink-faint)" };
  if (days === 0)   return { bg: "#BAE6FD", text: "#0369A1" };
  if (days <= 3)    return { bg: "#7DD3FC", text: "#0369A1" };
  if (days <= 7)    return { bg: "#A7F3D0", text: "#065F46" };
  if (days <= 14)   return { bg: "#FEF3C7", text: "#92400E" };
  if (days <= 30)   return { bg: "#FED7AA", text: "#9A3412" };
  if (days <= 60)   return { bg: "#FECACA", text: "#991B1B" };
  return                 { bg: "#FCA5A5", text: "#7F1D1D" };
};

// ── カラー ─────────────────────────────────────────────
const retentionColor = (r: number) =>
  r >= 70 ? "var(--sage)" : r >= 40 ? "var(--amber)" : "var(--terra)";

const cellColors = (studied: boolean, ret: number) => {
  if (!studied) return { bg: "var(--bg-elevated)", text: "var(--ink-faint)" };
  if (ret >= 70) return { bg: "var(--sage-light)",  text: "var(--sage)"  };
  if (ret >= 40) return { bg: "var(--amber-light)", text: "var(--amber)" };
  return             { bg: "var(--terra-light)", text: "var(--terra)" };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? payload[1]?.value;
  if (val == null) return null;
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--line-md)", borderRadius: 8, padding: "6px 12px", fontSize: 12, boxShadow: "var(--shadow-card)" }}>
      <span style={{ color: "var(--ink-muted)" }}>{label}  </span>
      <span style={{ fontWeight: 700, color: retentionColor(val) }}>{val}%</span>
    </div>
  );
};

export default function ForgettingCurveScreen({ state, onBack, onToggleConfident }: Props) {
  if (!state.examConfig) return null;
  const subjects = getEffectiveSubjects(state.examConfig.type, state);
  const [activeSubjectId, setActiveSubjectId] = useState(subjects[0].id);
  const [openTopicId, setOpenTopicId] = useState<string | null>(null);

  const activeSubject = subjects.find(s => s.id === activeSubjectId)!;

  const card: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1.5px solid var(--line-md)",
    borderRadius: 10,
    boxShadow: "var(--shadow-card)",
  };

  // 全論点をグリッド用に整形（studyRecords ベースのみ）
  const allTopics = activeSubject.topics.map(t => {
    const progress = state.topicProgress[t.id];
    const studied  = state.studyRecords.some(r => r.topicId === t.id);
    const ret      = studied ? currentRetention(t.id, state.studyRecords, !!progress?.selfConfident) : 0;
    return { topic: t, progress, studied, ret };
  });

  // ボトムシート用：選択中の論点
  const openEntry = openTopicId
    ? allTopics.find(e => e.topic.id === openTopicId)
    : null;

  const chartData = openEntry?.studied
    ? buildCurve(openEntry.topic.id, state.studyRecords)
    : null;

  const todayIdx = chartData?.data
    ? chartData.data.findIndex(d => {
        const today = new Date(); today.setHours(0,0,0,0);
        const [m, day] = d.label.split("/").map(Number);
        const dDate = new Date(); dDate.setMonth(m-1); dDate.setDate(day); dDate.setHours(0,0,0,0);
        return dDate.toDateString() === today.toDateString();
      })
    : -1;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>

      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "22px 20px 16px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          <ArrowLeft size={18} strokeWidth={1.6} color="var(--ink-muted)" />
        </button>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: 2 }}>
            エビングハウス忘却曲線
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>記憶の定着と減衰</div>
        </div>
      </div>

      <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* 科目タブ */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => { setActiveSubjectId(s.id); setOpenTopicId(null); }}
              style={{
                flexShrink: 0, padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: activeSubjectId === s.id ? "var(--ink)" : "var(--bg-card)",
                color: activeSubjectId === s.id ? "#FAF9F6" : "var(--ink-muted)",
                border: activeSubjectId === s.id ? "none" : "1.5px solid var(--line-md)",
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              {s.shortName}
            </button>
          ))}
        </div>

        {/* ── フクロウ吹き出しカード ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: "var(--bg-card)", border: "1.5px solid var(--line-md)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/owl-em-happy.png" alt="" style={{ width: 56, height: 56, objectFit: "contain", flexShrink: 0 }} />
          <div style={{ position: "relative", flex: 1 }}>
            <div style={{ position: "absolute", left: -10, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderRight: "9px solid var(--line-md)" }} />
            <div style={{ position: "absolute", left: -8, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderRight: "8px solid var(--bg-card)" }} />
            <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--line-md)", borderRadius: 12, padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "var(--ink)", lineHeight: 1.6 }}>
              タップすると忘却曲線と過去のメモが見られるよ！
            </div>
          </div>
        </div>

        {/* ── 論点グリッド ── */}
        <div style={{ ...card, padding: "14px 12px" }}>
          {/* タイトル */}
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "var(--ink-muted)", marginBottom: 10 }}>
            定着率
          </div>
          {/* 凡例 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 9, color: "var(--ink-muted)" }}>
            <span>定着率</span>
            {[
              { bg: "var(--terra-light)", text: "var(--terra)", label: "〜39%" },
              { bg: "var(--amber-light)", text: "var(--amber)", label: "40〜69%" },
              { bg: "var(--sage-light)",  text: "var(--sage)",  label: "70%〜" },
            ].map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c.bg, border: `1px solid ${c.text}`, opacity: 0.8 }} />
                <span style={{ color: c.text, fontWeight: 600 }}>{c.label}</span>
              </div>
            ))}
          </div>

          {/* グリッド */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
            {allTopics.map(({ topic, studied, ret }) => {
              const { bg, text } = cellColors(studied, ret);
              const name = topic.name.length > 8 ? topic.name.slice(0, 7) + "…" : topic.name;
              return (
                <button
                  key={topic.id}
                  onClick={() => studied ? setOpenTopicId(openTopicId === topic.id ? null : topic.id) : undefined}
                  style={{
                    padding: "9px 6px", borderRadius: 7, background: bg,
                    cursor: studied ? "pointer" : "default",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                    border: `1.5px solid ${openTopicId === topic.id ? text : "transparent"}`,
                    transition: "border-color 0.15s",
                  }}
                >
                  <div style={{ fontSize: 9, color: text, fontWeight: 600, lineHeight: 1.3, textAlign: "center" }}>{name}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: text, fontFamily: "var(--font-en)" }}>
                    {studied ? `${ret}%` : "−"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 経過日数ヒートマップ ── */}
        {(() => {
          const dangerList = allTopics
            .map(({ topic }) => ({
              name: topic.name,
              days: getDaysSince(topic.id, state.studyRecords),
            }))
            .filter(x => x.days !== null && x.days > 14)
            .sort((a, b) => (b.days ?? 0) - (a.days ?? 0))
            .slice(0, 5);

          return (
            <div style={{ ...card, padding: "14px 12px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "var(--ink-muted)", marginBottom: 10 }}>
                経過日数
              </div>

              {dangerList.length > 0 && (
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--terra-light)", border: "1px solid var(--terra-border)", marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--terra)", marginBottom: 6 }}>
                    ⚠️ 最近手薄な論点
                  </div>
                  {dangerList.map((t, i) => (
                    <div key={i} style={{ fontSize: 11, color: "var(--terra)", marginBottom: i < dangerList.length - 1 ? 3 : 0, display: "flex", justifyContent: "space-between" }}>
                      <span>{t.name}</span>
                      <span style={{ fontWeight: 700 }}>{t.days}日前</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 凡例 */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8, fontSize: 9, color: "var(--ink-muted)", flexWrap: "wrap" as const }}>
                <span>最近</span>
                {["#BAE6FD", "#7DD3FC", "#A7F3D0", "#FEF3C7", "#FED7AA", "#FECACA", "#FCA5A5"].map((bg, i) => (
                  <div key={i} style={{ width: 14, height: 10, borderRadius: 2, background: bg, border: "1px solid var(--line)" }} />
                ))}
                <span>危険</span>
              </div>

              {/* グリッド */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
                {allTopics.map(({ topic, studied }) => {
                  const days = getDaysSince(topic.id, state.studyRecords);
                  const { bg, text } = dayColor(days);
                  const label = days === null ? "未学習" : days === 0 ? "今日" : days === 1 ? "昨日" : `${days}日前`;
                  const name = topic.name.length > 8 ? topic.name.slice(0, 7) + "…" : topic.name;
                  return (
                    <button
                      key={topic.id}
                      onClick={() => studied ? setOpenTopicId(openTopicId === topic.id ? null : topic.id) : undefined}
                      style={{
                        padding: "9px 5px", borderRadius: 7, background: bg,
                        cursor: studied ? "pointer" : "default",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                        border: `1.5px solid ${openTopicId === topic.id ? text : "transparent"}`,
                        transition: "border-color 0.15s",
                      }}
                    >
                      <div style={{ fontSize: 9, color: text, fontWeight: 600, lineHeight: 1.3, textAlign: "center" }}>{name}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: text, fontFamily: "var(--font-en)" }}>{label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── 忘却曲線の仕組み（例示） ── */}
        <div style={{ ...card, padding: "18px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--ink-muted)", marginBottom: 10 }}>
            復習タイミングの例
          </div>
          <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.8, marginBottom: 18 }}>
            「だいたい理解できた（80%）」でスタートした場合のシミュレーションです。
            定着率が下がりきる前に復習すると、次の復習まで時間が伸びていきます。
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={EXAMPLE_CURVE_DATA.points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="exGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--sky)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--sky)" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--ink-muted)" }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 9, fill: "var(--ink-muted)" }} tickLine={false} axisLine={false} />
              <ReferenceLine y={40} stroke="var(--amber)" strokeDasharray="4 3" strokeWidth={1.2} label={{ value: "復習の目安", fill: "var(--amber)", fontSize: 9, position: "insideTopRight" }} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip content={({ active, payload, label }: any) => {
                if (!active || !payload?.length) return null;
                const val = payload[0]?.value;
                if (val == null) return null;
                return (
                  <div style={{ background: "var(--bg-card)", border: "1px solid var(--line-md)", borderRadius: 8, padding: "6px 12px", fontSize: 12, boxShadow: "var(--shadow-card)" }}>
                    <span style={{ color: "var(--ink-muted)" }}>{label}　</span>
                    <span style={{ fontWeight: 700, color: retentionColor(val) }}>{val}%</span>
                  </div>
                );
              }} />
              <Area type="monotone" dataKey="retention" stroke="var(--sky)" strokeWidth={2} fill="url(#exGrad)" dot={false} activeDot={{ r: 3, fill: "var(--sky)", strokeWidth: 0 }} />
              <Line type="monotone" dataKey="event" stroke="none"
                dot={(props) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const { cx, cy, value } = props as any;
                  if (!value) return <g key={`ex-dot-${cx}`} />;
                  return (
                    <g key={`ex-dot-${cx}`}>
                      <line x1={cx} y1={cy} x2={cx} y2={180} stroke="var(--sage)" strokeWidth={1} strokeDasharray="2 2" opacity={0.4} />
                      <circle cx={cx} cy={cy} r={5} fill="var(--sage)" stroke="#fff" strokeWidth={1.5} />
                    </g>
                  );
                }}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>

          <div style={{ display: "flex", gap: 14, marginTop: 10, marginBottom: 20, fontSize: 10, color: "var(--ink-muted)", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 16, height: 2, background: "var(--sky)", borderRadius: 1 }} />定着率の推移</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--sage)" }} />学習・復習</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 16, height: 0, borderTop: "1.5px dashed var(--amber)" }} />復習の目安（40%）</div>
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>復習間隔の変化</div>
          <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 8 }}>
            {EXAMPLE_CURVE_DATA.events.map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--sage)", border: "2px solid #fff", boxShadow: "0 0 0 1.5px var(--sage)" }} />
                  <div style={{ fontSize: 9, color: "var(--sage)", fontWeight: 700 }}>{e.day}日目</div>
                  <div style={{ fontSize: 8, color: "var(--ink-muted)", textAlign: "center", maxWidth: 56, lineHeight: 1.3 }}>{e.label}</div>
                </div>
                {i < EXAMPLE_CURVE_DATA.intervals.length && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 10px", gap: 3, flexShrink: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-en)", whiteSpace: "nowrap" }}>{EXAMPLE_CURVE_DATA.intervals[i]}日間</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <div style={{ width: 24, height: 1.5, background: "var(--line-md)", borderRadius: 1 }} />
                      <MoveRight size={10} strokeWidth={1.8} color="var(--ink-faint)" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 10px", gap: 3 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-en)" }}>14日間+</div>
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <div style={{ width: 24, height: 1.5, background: "var(--line-md)", borderRadius: 1 }} />
                  <MoveRight size={10} strokeWidth={1.8} color="var(--ink-faint)" />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 16, color: "var(--ink-faint)" }}>···</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, padding: "12px 14px", borderRadius: 10, background: "var(--sage-light)", border: "1px solid var(--sage-border)", fontSize: 12, color: "var(--ink)", lineHeight: 1.8 }}>
            復習するたびに記憶の安定度が上がり、次の復習まで待てる日数が伸びていきます。
            最初は <strong>5日</strong>、次は <strong>8日</strong>、その次は <strong>11日</strong>——これが
            <strong>間隔反復（Spaced Repetition）</strong>の仕組みです。
          </div>
          <div style={{ marginTop: 10, fontSize: 10, color: "var(--ink-muted)", lineHeight: 1.7 }}>
            ※ 上記の間隔はこのアプリの計算式（安定度 = 学習回数 × 3 + 2 日）に基づいたシミュレーションです。
          </div>
        </div>

      </div>

      {/* ── ボトムシート：論点の忘却曲線詳細 ── */}
      {openEntry?.studied && chartData && (
        <>
          <div onClick={() => setOpenTopicId(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 100 }} />
          <div style={{
            position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "100%", maxWidth: 480,
            background: "var(--bg-card)", borderRadius: "16px 16px 0 0",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
            zIndex: 101, maxHeight: "75vh", display: "flex", flexDirection: "column",
          }}>
            {/* ハンドル */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--line-md)" }} />
            </div>

            <div style={{ overflowY: "auto", padding: "12px 20px 32px" }}>
              {/* タイトル */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{openEntry.topic.name}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", background: "var(--sky-light)", color: "var(--sky)", border: "1px solid var(--sky-border)", borderRadius: 20 }}>
                    学習 {chartData.reviewCount} 回
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                    background: openEntry.ret >= 70 ? "var(--sage-light)" : openEntry.ret >= 40 ? "var(--amber-light)" : "var(--terra-light)",
                    color: retentionColor(openEntry.ret),
                    border: `1px solid ${openEntry.ret >= 70 ? "var(--sage-border)" : openEntry.ret >= 40 ? "var(--amber-border)" : "var(--terra-border)"}`,
                  }}>
                    現在の定着率 {openEntry.ret}%
                  </span>
                </div>
              </div>

              {/* グラフ */}
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData.data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id={`grad_${openEntry.topic.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--sky)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--sky)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id={`grad_f_${openEntry.topic.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--ink-faint)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--ink-faint)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--ink-muted)" }} tickLine={false} axisLine={false} interval={Math.floor(chartData.data.length / 6)} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 9, fill: "var(--ink-muted)" }} tickLine={false} axisLine={false} />
                  {todayIdx >= 0 && (
                    <ReferenceLine x={chartData.data[todayIdx]?.label} stroke="var(--amber)" strokeWidth={1.5} strokeDasharray="4 3" label={{ value: "今日", fill: "var(--amber)", fontSize: 9, position: "top" }} />
                  )}
                  <ReferenceLine y={70} stroke="var(--sage)" strokeDasharray="4 3" strokeWidth={1} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="past" stroke="var(--sky)" strokeWidth={2.5} fill={`url(#grad_${openEntry.topic.id})`} dot={false} activeDot={{ r: 4, fill: "var(--sky)", strokeWidth: 0 }} connectNulls={false} />
                  <Area type="monotone" dataKey="future" stroke="var(--ink-faint)" strokeWidth={1.5} strokeDasharray="5 4" fill={`url(#grad_f_${openEntry.topic.id})`} dot={false} connectNulls={false} />
                  <Line type="monotone" dataKey="studyDot" stroke="none"
                    dot={(props) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const { cx, cy, value } = props as any;
                      if (!value) return <g key={`dot-${cx}`} />;
                      return (
                        <g key={`dot-${cx}`}>
                          <line x1={cx} y1={cy} x2={cx} y2={160} stroke="var(--sage)" strokeWidth={1} strokeDasharray="2 2" opacity={0.5} />
                          <circle cx={cx} cy={cy} r={5} fill="var(--sage)" stroke="#fff" strokeWidth={1.5} />
                        </g>
                      );
                    }}
                    activeDot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>

              {/* 凡例 */}
              <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 10, color: "var(--ink-muted)", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 16, height: 2, background: "var(--sky)", borderRadius: 1 }} />実際の定着率</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 16, height: 0, borderTop: "2px dashed var(--ink-faint)" }} />今後の予測</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--sage)" }} />学習日</div>
              </div>

              {/* 自信ボタン */}
              {onToggleConfident && (() => {
                const confident = !!openEntry.progress.selfConfident;
                return (
                  <button
                    onClick={() => onToggleConfident(openEntry.topic.id, !confident)}
                    style={{
                      marginTop: 14, width: "100%", padding: "11px",
                      borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
                      border: `1.5px solid ${confident ? "var(--sage-border)" : "var(--line-md)"}`,
                      background: confident ? "var(--sage-light)" : "var(--bg-elevated)",
                      color: confident ? "var(--sage)" : "var(--ink-muted)",
                      transition: "all 0.2s",
                    }}
                  >
                    {confident ? "自信あり（忘却を遅延中）— 解除する" : "この論点は忘れない自信ある！"}
                  </button>
                );
              })()}

              {/* メモ履歴 */}
              {(() => {
                const memoRecords = state.studyRecords
                  .filter(r => r.topicId === openEntry.topic.id)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 8);
                if (memoRecords.length === 0) return null;
                return (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 8 }}>
                      学習メモ ({memoRecords.length}件)
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {memoRecords.map((r, i) => {
                        const dateStr = new Date(r.date).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
                        const timeStr = new Date(r.date).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
                        return (
                          <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: "var(--bg-elevated)", borderLeft: "3px solid var(--sky)" }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: (r.memo || r.rangeNote) ? 6 : 0, flexWrap: "wrap" as const }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sky)" }}>{dateStr}</span>
                              <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>{timeStr}</span>
                              {r.hours && <span style={{ fontSize: 10, color: "var(--ink-muted)" }}>{r.hours}h</span>}
                              {r.pageFrom != null && r.pageTo != null && (
                                <span style={{ fontSize: 10, color: "var(--sky)", fontWeight: 600 }}>p.{r.pageFrom}〜{r.pageTo}</span>
                              )}
                            </div>
                            {r.rangeNote && <div style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: r.memo ? 4 : 0 }}>範囲: {r.rangeNote}</div>}
                            {r.memo && <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.6 }}>{r.memo}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
