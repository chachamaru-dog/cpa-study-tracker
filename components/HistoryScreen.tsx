"use client";

import { useState } from "react";
import { AppState, STUDY_METHOD_META, StudyMethod } from "@/lib/types";
import { getSubjects } from "@/lib/examData";
import { calcIORate } from "@/lib/forgettingCurve";
import { ArrowLeft, BookOpen, Headphones, PenLine, Pencil, ScrollText, MessageSquare } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

const METHOD_ICONS: Record<StudyMethod, React.FC<{ size?: number; strokeWidth?: number; color?: string }>> = {
  text_reading:  BookOpen,
  audio_lecture: Headphones,
  summary_note:  PenLine,
  practice:      Pencil,
  past_exam:     ScrollText,
  oral:          MessageSquare,
};

interface Props {
  state: AppState;
  onBack: () => void;
}

type Period = "week" | "month" | "year" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  week: "今週",
  month: "今月",
  year: "今年",
  all: "全期間",
};

const SUBJECT_COLORS = [
  "var(--sky)", "var(--lavender)", "var(--sage)", "var(--terra)", "var(--amber)",
  "#A78BFA", "#34D399", "#F472B6", "#60A5FA", "#FBBF24",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--line-md)",
      borderRadius: 8, padding: "6px 12px", fontSize: 11, boxShadow: "var(--shadow-card)",
    }}>
      <span style={{ color: "var(--ink-muted)" }}>{label}  </span>
      <span style={{ fontWeight: 700, color: "var(--sky)" }}>{payload[0].value}h</span>
    </div>
  );
};

export default function HistoryScreen({ state, onBack }: Props) {
  const [period, setPeriod] = useState<Period>("week");
  const [ioOpen, setIoOpen] = useState<"input" | "output" | null>(null);
  const records  = state.studyRecords;
  const subjects = getSubjects(state.examConfig!.type);

  /* ── 期間ごとのバーデータ ── */
  const buildData = (): { label: string; hours: number; sessions: number }[] => {
    if (period === "week") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        d.setHours(0, 0, 0, 0);
        const next = new Date(d); next.setDate(d.getDate() + 1);
        const recs = records.filter(r => {
          const t = new Date(r.date).getTime();
          return t >= d.getTime() && t < next.getTime();
        });
        return {
          label: ["日","月","火","水","木","金","土"][d.getDay()],
          hours: Math.round(recs.reduce((s, r) => s + (r.hours ?? 0), 0) * 10) / 10,
          sessions: recs.length,
        };
      });
    }
    if (period === "month") {
      return Array.from({ length: 5 }, (_, i) => {
        const end = new Date();
        end.setDate(end.getDate() - (4 - i) * 7);
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        const recs = records.filter(r => {
          const t = new Date(r.date).getTime();
          return t >= start.getTime() && t <= end.getTime();
        });
        return {
          label: `${start.getMonth() + 1}/${start.getDate()}〜`,
          hours: Math.round(recs.reduce((s, r) => s + (r.hours ?? 0), 0) * 10) / 10,
          sessions: recs.length,
        };
      });
    }
    if (period === "year") {
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (11 - i));
        const year = d.getFullYear();
        const month = d.getMonth();
        const recs = records.filter(r => {
          const rd = new Date(r.date);
          return rd.getFullYear() === year && rd.getMonth() === month;
        });
        return {
          label: `${month + 1}月`,
          hours: Math.round(recs.reduce((s, r) => s + (r.hours ?? 0), 0) * 10) / 10,
          sessions: recs.length,
        };
      });
    }
    // all
    if (records.length === 0) return [];
    const earliest = new Date(Math.min(...records.map(r => new Date(r.date).getTime())));
    earliest.setDate(1); earliest.setHours(0, 0, 0, 0);
    const now = new Date();
    const months: { label: string; hours: number; sessions: number }[] = [];
    const cur = new Date(earliest);
    while (cur.getFullYear() < now.getFullYear() || cur.getMonth() <= now.getMonth()) {
      const year = cur.getFullYear(); const month = cur.getMonth();
      const recs = records.filter(r => {
        const rd = new Date(r.date);
        return rd.getFullYear() === year && rd.getMonth() === month;
      });
      months.push({
        label: `${year !== now.getFullYear() ? `${year}/` : ""}${month + 1}月`,
        hours: Math.round(recs.reduce((s, r) => s + (r.hours ?? 0), 0) * 10) / 10,
        sessions: recs.length,
      });
      cur.setMonth(cur.getMonth() + 1);
      if (months.length > 60) break;
    }
    return months;
  };

  /* ── 期間フィルタ ── */
  const getPeriodStart = (): Date => {
    if (period === "all") return new Date(0);
    const d = new Date();
    if (period === "week")  { d.setDate(d.getDate() - 6); }
    if (period === "month") { d.setDate(d.getDate() - 34); }
    if (period === "year")  { d.setMonth(d.getMonth() - 11); }
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const data          = buildData();
  const periodRecords = records.filter(r => new Date(r.date) >= getPeriodStart());
  const totalHours    = Math.round(periodRecords.reduce((s, r) => s + (r.hours ?? 0), 0) * 10) / 10;
  const totalSessions = periodRecords.length;
  const avgHours      = data.length > 0
    ? Math.round((totalHours / data.filter(d => d.hours > 0).length || 0) * 10) / 10
    : 0;

  /* ── 科目別内訳 ── */
  const bySubject = subjects.map((s, i) => {
    const hrs = periodRecords
      .filter(r => r.subjectId === s.id)
      .reduce((sum, r) => sum + (r.hours ?? 0), 0);
    return { name: s.shortName ?? s.name, hours: Math.round(hrs * 10) / 10, color: SUBJECT_COLORS[i % SUBJECT_COLORS.length] };
  }).filter(s => s.hours > 0).sort((a, b) => b.hours - a.hours);

  /* ── 学習方法内訳 ── */
  const methodMap: Record<string, number> = {};
  for (const r of periodRecords) {
    methodMap[r.method] = (methodMap[r.method] ?? 0) + (r.hours ?? 0);
  }
  const byMethod = Object.entries(methodMap)
    .map(([method, hours]) => ({ method, hours: Math.round(hours * 10) / 10 }))
    .sort((a, b) => b.hours - a.hours);

  const METHOD_LABELS: Record<string, string> = {
    text_reading: "テキスト精読", audio_lecture: "講義音声",
    summary_note: "まとめノート", practice: "問題演習",
    past_exam: "過去問", oral: "口述",
  };

  const maxHours = Math.max(...data.map(d => d.hours), 1);
  const barColor = (h: number) =>
    h >= maxHours * 0.8 ? "var(--sky)" : h >= maxHours * 0.4 ? "var(--sky)" : "var(--sky)";

  const card: React.CSSProperties = {
    background: "var(--bg-card)", border: "1.5px solid var(--line-md)",
    borderRadius: 12, padding: "16px 14px", boxShadow: "var(--shadow-card)",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>

      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "22px 20px 16px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          <ArrowLeft size={18} strokeWidth={1.6} color="var(--ink-muted)" />
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>学習ログ</div>
      </div>

      <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* 期間タブ */}
        <div style={{ display: "flex", gap: 0, background: "var(--bg-elevated)", borderRadius: 10, padding: 3 }}>
          {(["week", "month", "year", "all"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 700,
                background: period === p ? "var(--bg-card)" : "transparent",
                color: period === p ? "var(--ink)" : "var(--ink-muted)",
                border: "none", cursor: "pointer",
                boxShadow: period === p ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.2s",
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* サマリー */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "学習時間", value: `${totalHours}`, unit: "h", color: "var(--sky)" },
            { label: "記録数",   value: `${totalSessions}`, unit: "件", color: "var(--lavender)" },
            { label: "平均/日",  value: `${isNaN(avgHours) ? 0 : avgHours}`, unit: "h", color: "var(--sage)" },
          ].map((s, i) => (
            <div key={i} style={{ ...card, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "var(--ink-muted)", fontWeight: 600, letterSpacing: "0.1em", marginBottom: 4 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "var(--font-en)", lineHeight: 1 }}>
                {s.value}
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-muted)", marginLeft: 2 }}>{s.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* バーチャート */}
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", letterSpacing: "0.1em", marginBottom: 12, textTransform: "uppercase" as const }}>
            学習時間
          </div>
          {totalSessions === 0 ? (
            <div style={{ textAlign: "center", color: "var(--ink-muted)", fontSize: 13, padding: "24px 0" }}>
              この期間の記録はありません
            </div>
          ) : period === "all" && data.length > 12 ? (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <BarChart data={data} width={Math.max(data.length * 36, 300)} height={160} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 8, fill: "var(--ink-muted)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "var(--ink-muted)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.hours > 0 ? barColor(entry.hours) : "var(--bg-elevated)"} />
                  ))}
                </Bar>
              </BarChart>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--ink-muted)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "var(--ink-muted)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.hours > 0 ? barColor(entry.hours) : "var(--bg-elevated)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 科目別内訳 */}
        {bySubject.length > 0 && (
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", letterSpacing: "0.1em", marginBottom: 12, textTransform: "uppercase" as const }}>
              科目別
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {bySubject.map((s, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{s.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.color, fontFamily: "var(--font-en)" }}>{s.hours}h</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "var(--bg-elevated)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 3, background: s.color,
                      width: `${totalHours > 0 ? Math.round(s.hours / totalHours * 100) : 0}%`,
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 学習方法内訳 */}
        {byMethod.length > 0 && (
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", letterSpacing: "0.1em", marginBottom: 12, textTransform: "uppercase" as const }}>
              学習方法
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {byMethod.map((m, i) => (
                <div key={i} style={{
                  padding: "6px 12px", borderRadius: 20,
                  background: "var(--bg-elevated)", border: "1px solid var(--line-md)",
                  fontSize: 11, display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ color: "var(--ink)", fontWeight: 600 }}>{METHOD_LABELS[m.method] ?? m.method}</span>
                  <span style={{ color: "var(--sky)", fontWeight: 700, fontFamily: "var(--font-en)" }}>{m.hours}h</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* インプット / アウトプット バランス */}
        {(() => {
          const ioRate = calcIORate(state);
          const totalIO = ioRate.inputCount + ioRate.outputCount;
          if (totalIO === 0) return null;
          const IO_IN  = "#9B6B47";
          const IO_OUT = "#2E8B57";
          return (
            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", letterSpacing: "0.1em", marginBottom: 12, textTransform: "uppercase" as const }}>
                学習バランス · 30日
              </div>
              {/* バー */}
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "var(--bg-elevated)", marginBottom: 10 }}>
                {ioRate.inputRate > 0 && <div style={{ width: `${ioRate.inputRate}%`, background: IO_IN }} />}
                {ioRate.outputRate > 0 && <div style={{ width: `${ioRate.outputRate}%`, background: IO_OUT }} />}
              </div>
              {/* ボタン */}
              <div style={{ display: "flex", gap: 8, marginBottom: ioOpen ? 14 : 0 }}>
                {(["input", "output"] as const).map(type => {
                  const isInput = type === "input";
                  const rate    = isInput ? ioRate.inputRate : ioRate.outputRate;
                  const color   = isInput ? IO_IN : IO_OUT;
                  const isOpenType = ioOpen === type;
                  return (
                    <button key={type}
                      onClick={() => setIoOpen(isOpenType ? null : type)}
                      style={{
                        flex: 1, padding: "8px 10px",
                        background: isOpenType ? (isInput ? "rgba(155,107,71,0.1)" : "rgba(46,139,87,0.1)") : "var(--bg-elevated)",
                        border: `1.5px solid ${isOpenType ? color : "var(--line-md)"}`,
                        borderRadius: 6, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        transition: "all 0.2s",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color }}>{isInput ? "インプット" : "アウトプット"}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "var(--font-en)" }}>{rate}%</span>
                    </button>
                  );
                })}
              </div>
              {/* 内訳グリッド */}
              {ioOpen && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {(Object.entries(STUDY_METHOD_META) as [StudyMethod, typeof STUDY_METHOD_META[StudyMethod]][])
                    .filter(([, meta]) => meta.type === ioOpen)
                    .map(([method, meta]) => {
                      const w = Math.round((ioRate.byMethod[method] ?? 0) * 10) / 10;
                      const color = ioOpen === "input" ? IO_IN : IO_OUT;
                      const MI = METHOD_ICONS[method];
                      return (
                        <div key={method} style={{
                          background: "var(--bg-elevated)", border: "1px solid var(--line)",
                          borderRadius: 6, padding: "10px 6px", textAlign: "center",
                          opacity: w > 0 ? 1 : 0.4,
                        }}>
                          <div style={{ display: "flex", justifyContent: "center", marginBottom: 5 }}>
                            <MI size={14} strokeWidth={1.4} color={color} />
                          </div>
                          <div style={{ fontSize: 9, color: "var(--ink-muted)", lineHeight: 1.3, marginBottom: 5 }}>{meta.label}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: w > 0 ? color : "var(--ink-faint)" }}>
                            {w > 0 ? `${w}h` : "—"}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })()}

        {totalSessions === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "40px 20px", color: "var(--ink-muted)", fontSize: 13 }}>
            まだこの期間の学習記録がありません
          </div>
        )}

      </div>
    </div>
  );
}
