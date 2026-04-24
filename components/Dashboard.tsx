"use client";

import { useState } from "react";
import {
  AreaChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid,
} from "recharts";
import { AppState, StudyRecord, StudyReminder, TopicProgress } from "@/lib/types";
import { getEffectiveSubjects } from "@/lib/examData";
import { ArrowLeft, PenLine, Bell, CalendarDays } from "lucide-react";

interface Props {
  state: AppState;
  onNavigate: (page: "record" | "natural") => void;
  onBack?: () => void;
  onToggleConfident?: (topicId: string, confident: boolean) => void;
  onSaveReminders?: (reminders: StudyReminder[]) => void;
}

// ── 忘却曲線ユーティリティ ───────────────────────────────
const stabilityOf = (reviewCount: number) => Math.max(1, reviewCount * 3 + 2);
const retentionAt = (daysSince: number, reviewCount: number, initial = 100) =>
  Math.max(0, Math.round(initial * Math.exp(-daysSince / stabilityOf(reviewCount))));

// 直近の理解度（最新のunderstandingを返す）
const getLatestUnderstanding = (topicId: string, studyRecords: StudyRecord[]): number | null => {
  const recs = studyRecords
    .filter(r => r.topicId === topicId && r.understanding != null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return recs[0]?.understanding ?? null;
};

const currentRetention = (progress: TopicProgress, studyRecords: StudyRecord[]): number => {
  const days      = Math.floor((Date.now() - new Date(progress.lastStudied).getTime()) / 86400000);
  const latest    = getLatestUnderstanding(progress.topicId, studyRecords);
  const initial   = latest ?? 70;
  const stability = stabilityOf(progress.studyCount) * (progress.selfConfident ? 2 : 1);
  return Math.max(0, Math.round(initial * Math.exp(-days / stability)));
};

const buildCurve = (topicId: string, progress: TopicProgress, records: StudyRecord[]) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const topicRecs = records.filter(r => r.topicId === topicId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const eventDates: Date[] = [];
  if (topicRecs.length > 0) {
    const seen = new Set<string>();
    for (const r of topicRecs) {
      const d = new Date(r.date); d.setHours(0,0,0,0);
      if (!seen.has(d.toDateString())) { seen.add(d.toDateString()); eventDates.push(d); }
    }
  } else {
    const d = new Date(progress.lastStudied); d.setHours(0,0,0,0); eventDates.push(d);
  }

  const understandingByDay = new Map<string, number>();
  for (const r of topicRecs) {
    if (r.understanding == null) continue;
    const d = new Date(r.date); d.setHours(0,0,0,0);
    understandingByDay.set(d.toDateString(), Math.max(understandingByDay.get(d.toDateString()) ?? 0, r.understanding));
  }

  const firstEvent = eventDates[0];
  const endDate    = new Date(today.getTime() + 21 * 86400000);
  const daysBack   = Math.min(14, Math.floor((today.getTime() - firstEvent.getTime()) / 86400000));
  const startDate  = new Date(firstEvent.getTime() - daysBack * 86400000);

  const data: { label: string; past?: number; future?: number; studyDot?: number }[] = [];
  const cur = new Date(startDate);
  let anchor = new Date(firstEvent);
  let reviewCount = 0;
  // 最初のイベント日の理解度を使う（なければ70）
  const firstUnderstanding = understandingByDay.get(firstEvent.toDateString()) ?? 70;
  let currentInitial = firstUnderstanding;

  while (cur <= endDate) {
    const isEvent = eventDates.some(d => d.toDateString() === cur.toDateString());
    const isPast  = cur <= today;
    const isToday = cur.toDateString() === today.toDateString();
    if (isEvent && isPast) {
      currentInitial = understandingByDay.get(cur.toDateString()) ?? currentInitial;
      anchor = new Date(cur); reviewCount++;
    }
    const days = Math.max(0, (cur.getTime() - anchor.getTime()) / 86400000);
    const r = cur < firstEvent ? 0 : retentionAt(days, reviewCount, currentInitial);
    data.push({
      label: `${cur.getMonth()+1}/${cur.getDate()}`,
      past:     isPast || isToday ? r : undefined,
      future:   !isPast || isToday ? r : undefined,
      studyDot: isEvent && isPast ? currentInitial : undefined,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return { data, reviewCount };
};

// ── カラーヘルパー ───────────────────────────────────────
const getDaysUntil = (dateStr: string) => {
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000);
};

const probColor = (s: number) =>
  s >= 70 ? "var(--sage)" : s >= 50 ? "var(--amber)" : s >= 30 ? "var(--terra)" : "#B04A35";

const retHeatColor = (ret: number, studied: boolean) => {
  if (!studied) return { bg: "var(--bg-elevated)", text: "var(--ink-faint)" };
  if (ret >= 70) return { bg: "#A7F3D0", text: "#065F46" };
  if (ret >= 50) return { bg: "#D1FAE5", text: "#065F46" };
  if (ret >= 30) return { bg: "#FEF3C7", text: "#92400E" };
  if (ret >= 15) return { bg: "#FECACA", text: "#991B1B" };
  return { bg: "#FEE2E2", text: "#991B1B" };
};

const retColor = (r: number) =>
  r >= 70 ? "var(--sage)" : r >= 40 ? "var(--amber)" : "var(--terra)";

const dayColor = (days: number | null): { bg: string; text: string; border: string } => {
  if (days === null) return { bg: "var(--bg-elevated)", text: "var(--ink-faint)",  border: "var(--line)" };
  if (days === 0)    return { bg: "#BAE6FD", text: "#0369A1", border: "#7DD3FC" };
  if (days <= 3)     return { bg: "#93C5FD", text: "#1E40AF", border: "#60A5FA" };
  if (days <= 7)     return { bg: "#86EFAC", text: "#14532D", border: "#4ADE80" };
  if (days <= 14)    return { bg: "#FDE68A", text: "#78350F", border: "#FCD34D" };
  if (days <= 30)    return { bg: "#FDBA74", text: "#7C2D12", border: "#FB923C" };
  if (days <= 60)    return { bg: "#FCA5A5", text: "#7F1D1D", border: "#F87171" };
  return                   { bg: "#F87171", text: "#450A0A", border: "#EF4444" };
};

const getDaysSince = (topicId: string, studyRecords: AppState["studyRecords"]): number | null => {
  const recs = studyRecords.filter(r => r.topicId === topicId);
  if (recs.length === 0) return null;
  const latest = Math.max(...recs.map(r => new Date(r.date).getTime()));
  const latestMidnight = new Date(latest); latestMidnight.setHours(0, 0, 0, 0);
  const todayMidnight  = new Date();        todayMidnight.setHours(0, 0, 0, 0);
  return Math.floor((todayMidnight.getTime() - latestMidnight.getTime()) / 86400000);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? payload[1]?.value;
  if (val == null) return null;
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--line-md)", borderRadius: 8, padding: "5px 10px", fontSize: 11, boxShadow: "var(--shadow-card)" }}>
      <span style={{ color: "var(--ink-muted)" }}>{label}  </span>
      <span style={{ fontWeight: 700, color: retColor(val) }}>{val}%</span>
    </div>
  );
};

export default function Dashboard({ state, onNavigate, onBack, onToggleConfident, onSaveReminders }: Props) {
  const { examConfig, topicProgress } = state;
  if (!examConfig) return null;

  const subjects     = getEffectiveSubjects(examConfig.type, state);
  const mockRecords  = state.mockExamRecords ?? [];
  const textbooks    = state.textbooks ?? [];
  const daysLeft     = getDaysUntil(examConfig.examDate);
  const [activeSubjectId, setActiveSubjectId] = useState(subjects[0].id);
  const [openTopicId,     setOpenTopicId]     = useState<string | null>(null);
  const [openFromDays,    setOpenFromDays]    = useState(false);

  // リマインダー関連
  const reminders       = state.reminders ?? [];
  const [reminderTopicId, setReminderTopicId] = useState<string | null>(null);
  const [showCustomDate,  setShowCustomDate]  = useState(false);
  const [reminderDate,    setReminderDate]    = useState("");

  const recentRecords = state.studyRecords.filter(
    r => (Date.now() - new Date(r.date).getTime()) / 86400000 <= 7
  ).length;

  const activeSubject  = subjects.find(s => s.id === activeSubjectId)!;

  // 科目の平均定着率
  const getSubjectAvgRetention = (subjectId: string): number => {
    const vals = subjects.find(s => s.id === subjectId)?.topics
      .map(t => {
        const p = topicProgress[t.id];
        if (!p || (p.studyCount ?? 0) === 0) return null;
        return currentRetention(p, state.studyRecords);
      })
      .filter((v): v is number => v !== null) ?? [];
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  };
  const activeRetention = getSubjectAvgRetention(activeSubjectId);

  const daysColor = daysLeft <= 30 ? "var(--terra)" : daysLeft <= 90 ? "var(--amber)" : "var(--ink)";

  const card: React.CSSProperties = {
    background: "var(--bg-card)", border: "1.5px solid var(--line-md)",
    borderRadius: 10, boxShadow: "var(--shadow-card)",
  };

  // ── ボトムシートデータ ──────────────────────────────────
  const openTopic   = openTopicId ? activeSubject.topics.find(t => t.id === openTopicId) : null;
  const openProg    = openTopicId ? topicProgress[openTopicId] : null;
  const openStudied = (openProg?.studyCount ?? 0) > 0;
  const openUnderstanding = openTopicId ? (getLatestUnderstanding(openTopicId, state.studyRecords) ?? 0) : 0;
  const openRet           = openProg && openStudied ? currentRetention(openProg, state.studyRecords) : 0;
  const curve       = openProg && openStudied ? buildCurve(openTopicId!, openProg, state.studyRecords) : null;
  const memoRecords = openTopicId
    ? state.studyRecords.filter(r => r.topicId === openTopicId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8)
    : [];
  const todayLabel = (() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return curve?.data.find(d => {
      const [m, day] = d.label.split("/").map(Number);
      const dd = new Date(); dd.setMonth(m-1); dd.setDate(day); dd.setHours(0,0,0,0);
      return dd.toDateString() === today.toDateString();
    })?.label ?? null;
  })();

  // リマインダー設定
  const requestPermission = async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    const p = await Notification.requestPermission();
    return p === "granted";
  };

  const addDays = (n: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    d.setHours(8, 0, 0, 0);
    return d.toISOString();
  };

  const saveReminder = async (topicId: string, topicName: string, isoDate: string) => {
    await requestPermission();
    const newR: StudyReminder = {
      id: `rem_${Date.now()}`,
      topicId, topicName,
      subjectName: activeSubject.name,
      scheduledAt: isoDate,
    };
    onSaveReminders?.([...reminders.filter(r => r.topicId !== topicId), newR]);
    setReminderTopicId(null);
    setShowCustomDate(false);
    setReminderDate("");
  };

  const clearReminder = (topicId: string) => {
    onSaveReminders?.(reminders.filter(r => r.topicId !== topicId));
  };

  const reminderTopic = reminderTopicId ? activeSubject.topics.find(t => t.id === reminderTopicId) : null;
  const existingReminder = reminderTopicId ? reminders.find(r => r.topicId === reminderTopicId) : null;
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>

      {/* ヘッダー */}
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
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--sky)", fontFamily: "var(--font-en)" }}>
            {recentRecords}<span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-muted)", marginLeft: 2 }}>件</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* フクロウ吹き出し */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <img src="/owl-happy.png" alt="" style={{ width: 64, height: 94, objectFit: "contain", objectPosition: "bottom", flexShrink: 0 }} />
          <div style={{ position: "relative", flex: 1, marginTop: 8 }}>
            <div style={{ background: "#FFFEF7", border: "1.5px solid var(--line-md)", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "var(--ink)", lineHeight: 1.6, boxShadow: "1px 2px 6px rgba(51,65,85,0.08)" }}>
              定着率カードをタップすると忘却曲線が見られるよ！経過日数カードをタップすると復習通知を設定できるよ！
            </div>
            <div style={{ position: "absolute", left: -8, top: 14, width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderRight: "9px solid var(--line-md)" }} />
            <div style={{ position: "absolute", left: -6, top: 15, width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderRight: "8px solid #FFFEF7" }} />
          </div>
        </div>

        {/* 科目タブ */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {subjects.map(s => (
            <button key={s.id} onClick={() => { setActiveSubjectId(s.id); setOpenTopicId(null); }}
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

        {/* ── 定着率ヒートマップ ── */}
        <div style={{ ...card, borderRadius: 12, padding: "16px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#1E5B8C", letterSpacing: "0.06em", borderBottom: "2px solid #1E5B8C", paddingBottom: 4, whiteSpace: "nowrap" }}>
              定着率
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 10, borderRadius: 5, background: "var(--bg-elevated)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${activeRetention}%`, background: probColor(activeRetention), borderRadius: 5, transition: "width 0.7s ease" }} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: probColor(activeRetention), textAlign: "right", marginTop: 2 }}>{activeRetention}%</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {activeSubject.topics.map(t => {
              const p       = topicProgress[t.id];
              const studied = state.studyRecords.some(r => r.topicId === t.id);
              const ret     = p && studied ? currentRetention(p, state.studyRecords) : 0;
              const { bg, text } = retHeatColor(ret, studied);
              const hasMemo = state.studyRecords.some(r => r.topicId === t.id && (r.memo || r.rangeNote));
              const name    = t.name.length > 8 ? t.name.slice(0, 7) + "…" : t.name;
              const isOpen  = openTopicId === t.id;
              return (
                <button key={t.id} onClick={() => { if (isOpen) { setOpenTopicId(null); } else { setOpenTopicId(t.id); setOpenFromDays(false); } }}
                  style={{
                    padding: "10px 6px 8px", borderRadius: 8, background: bg, cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    border: isOpen ? `2px solid ${text}` : "1.5px solid transparent",
                    boxShadow: isOpen ? `0 0 0 3px ${text}18` : "none",
                    position: "relative", transition: "all 0.15s",
                    minHeight: 62,
                  }}
                >
                  <div style={{ fontSize: 9, color: text, fontWeight: 600, lineHeight: 1.3, textAlign: "center", opacity: 0.85 }}>{name}</div>
                  {studied ? (
                    <div style={{ fontSize: 18, fontWeight: 900, color: text, fontFamily: "var(--font-en)", lineHeight: 1 }}>
                      {ret}<span style={{ fontSize: 10, fontWeight: 600, marginLeft: 1 }}>%</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: text, fontWeight: 700 }}>未学習</div>
                  )}
                  {hasMemo && (
                    <div style={{ position: "absolute", top: 4, right: 4, width: 5, height: 5, borderRadius: "50%", background: text, opacity: 0.6 }} />
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 9, color: "var(--ink-muted)" }}>
            <span>低い</span>
            {["var(--bg-elevated)", "#FEE2E2", "#FECACA", "#FEF3C7", "#D1FAE5", "#A7F3D0"].map((b, i) => (
              <div key={i} style={{ width: 14, height: 9, borderRadius: 2, background: b, border: "1px solid rgba(0,0,0,0.1)" }} />
            ))}
            <span>高い</span>
          </div>
        </div>

        {/* ── 経過日数グリッド ── */}
        <div style={{ ...card, borderRadius: 12, padding: "16px 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#8B4513", letterSpacing: "0.06em", borderBottom: "2px solid #8B4513", paddingBottom: 4, marginBottom: 12, display: "inline-block" }}>
            経過日数
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {activeSubject.topics.map(t => {
              const days = getDaysSince(t.id, state.studyRecords);
              const { bg, text, border } = dayColor(days);
              const name   = t.name.length > 8 ? t.name.slice(0, 7) + "…" : t.name;
              const hasRem = reminders.some(r => r.topicId === t.id);
              const isOpen = openTopicId === t.id;
              return (
                <button key={t.id}
                  onClick={() => { if (isOpen) { setOpenTopicId(null); } else { setOpenTopicId(t.id); setOpenFromDays(true); } }}
                  style={{
                    padding: "10px 6px 8px", borderRadius: 8, background: bg, cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    border: isOpen ? `2px solid ${text}` : hasRem ? `1.5px solid var(--sky)` : `1.5px solid ${border}`,
                    position: "relative", transition: "all 0.15s",
                    minHeight: 62,
                  }}>
                  <div style={{ fontSize: 9, color: text, fontWeight: 600, lineHeight: 1.3, textAlign: "center", opacity: 0.85 }}>{name}</div>
                  {days === null ? (
                    <div style={{ fontSize: 10, color: text, fontWeight: 700 }}>未学習</div>
                  ) : days === 0 ? (
                    <div style={{ fontSize: 14, fontWeight: 900, color: text }}>今日</div>
                  ) : days === 1 ? (
                    <div style={{ fontSize: 14, fontWeight: 900, color: text }}>昨日</div>
                  ) : (
                    <div style={{ textAlign: "center", lineHeight: 1 }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: text, fontFamily: "var(--font-en)" }}>{days}</span>
                      <span style={{ fontSize: 9, color: text, opacity: 0.75, marginLeft: 1 }}>日前</span>
                    </div>
                  )}
                  {hasRem && (
                    <Bell size={9} strokeWidth={2.2} color="var(--sky)" />
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 9, color: "var(--ink-muted)" }}>
            <span>最近</span>
            {["#BAE6FD", "#93C5FD", "#86EFAC", "#FDE68A", "#FDBA74", "#FCA5A5", "#F87171"].map((bg, i) => (
              <div key={i} style={{ width: 14, height: 10, borderRadius: 2, background: bg, border: "1px solid rgba(0,0,0,0.1)" }} />
            ))}
            <span>遠い</span>
          </div>
        </div>

        {/* アクションボタン */}
        <button onClick={() => onNavigate("natural")} className="btn-main"
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <PenLine size={14} strokeWidth={2} />
          今日の学習を記録する
        </button>

      </div>

      {/* ── ボトムシート：忘却曲線 + メモ（習熟度グリッドから） ── */}
      {openTopicId && openTopic && (
        <>
          <div onClick={() => setOpenTopicId(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.38)", zIndex: 100 }} />
          <div style={{
            position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "100%", maxWidth: 480,
            background: "var(--bg-card)", borderRadius: "16px 16px 0 0",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
            zIndex: 101, maxHeight: "80vh", display: "flex", flexDirection: "column",
          }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0", flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--line-md)" }} />
            </div>

            <div style={{ overflowY: "auto", padding: "12px 20px 36px" }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{openTopic.name}</div>
                  {/* 定着率シート：自信あり / 経過日数シート：通知設定 */}
                  {!openFromDays && onToggleConfident && openStudied && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                      <button
                        onClick={() => onToggleConfident(openTopicId!, !openProg!.selfConfident)}
                        style={{
                          padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                          fontSize: 11, fontWeight: 700, lineHeight: 1.3, textAlign: "center",
                          border: `1.5px solid ${openProg!.selfConfident ? "var(--sage-border)" : "var(--line-md)"}`,
                          background: openProg!.selfConfident ? "var(--sage-light)" : "var(--bg-elevated)",
                          color: openProg!.selfConfident ? "var(--sage)" : "var(--ink-muted)",
                          transition: "all 0.2s", maxWidth: 120,
                        }}
                      >
                        {openProg!.selfConfident ? "自信あり（忘却を遅延中）— 解除する" : "この論点は忘れない自信ある！"}
                      </button>
                      <div style={{ fontSize: 9, color: "var(--ink-faint)", textAlign: "right", maxWidth: 120, lineHeight: 1.4 }}>
                        押すと忘却の度合いがゆるやかになるよ！
                      </div>
                    </div>
                  )}
                  {openFromDays && (() => {
                    const existing = reminders.find(r => r.topicId === openTopicId);
                    return existing ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, background: "var(--sky-light)", border: "1px solid var(--sky-border)", flexShrink: 0 }}>
                        <Bell size={12} strokeWidth={1.8} color="var(--sky)" />
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--sky)" }}>
                          {new Date(existing.scheduledAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}通知予定
                        </span>
                        <button onClick={() => onSaveReminders?.(reminders.filter(r => r.topicId !== openTopicId))}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--sky)", fontWeight: 600, padding: "0 2px" }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                        <button onClick={() => { setReminderTopicId(openTopicId); setShowCustomDate(false); setReminderDate(""); }}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, background: "var(--bg-elevated)", border: "1.5px dashed var(--line-md)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--ink-muted)" }}>
                          <Bell size={12} strokeWidth={1.8} />通知設定
                        </button>
                        <div style={{ fontSize: 9, color: "var(--ink-faint)", textAlign: "right", maxWidth: 130, lineHeight: 1.4 }}>
                          復習したいタイミングを設定すると、通知で教えてくれるよ！
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {openStudied ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", background: "var(--sky-light)", color: "var(--sky)", border: "1px solid var(--sky-border)", borderRadius: 20 }}>
                      学習 {openProg!.studyCount} 回
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                      background: openRet >= 70 ? "var(--sage-light)" : openRet >= 40 ? "var(--amber-light)" : "var(--terra-light)",
                      color: retColor(openRet),
                      border: `1px solid ${openRet >= 70 ? "var(--sage-border)" : openRet >= 40 ? "var(--amber-border)" : "var(--terra-border)"}`,
                    }}>
                      定着率 {openRet}%
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>まだ学習記録がありません</span>
                )}
              </div>

              {curve && !openFromDays && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>忘却曲線</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={curve.data} margin={{ top: 6, right: 6, bottom: 0, left: -24 }}>
                      <defs>
                        <linearGradient id={`g_${openTopicId}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="var(--sky)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--sky)" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id={`gf_${openTopicId}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="var(--ink-faint)" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="var(--ink-faint)" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 8, fill: "var(--ink-muted)" }} tickLine={false} axisLine={false} interval={Math.floor(curve.data.length / 5)} />
                      <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fontSize: 8, fill: "var(--ink-muted)" }} tickLine={false} axisLine={false} />
                      {todayLabel && <ReferenceLine x={todayLabel} stroke="var(--amber)" strokeWidth={1.5} strokeDasharray="4 3" label={{ value: "今日", fill: "var(--amber)", fontSize: 8, position: "top" }} />}
                      <ReferenceLine y={70} stroke="var(--sage)" strokeDasharray="4 3" strokeWidth={1} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="past" stroke="var(--sky)" strokeWidth={2} fill={`url(#g_${openTopicId})`} dot={false} connectNulls={false} />
                      <Area type="monotone" dataKey="future" stroke="var(--ink-faint)" strokeWidth={1.5} strokeDasharray="5 4" fill={`url(#gf_${openTopicId})`} dot={false} connectNulls={false} />
                      <Line type="monotone" dataKey="studyDot" stroke="none"
                        dot={(props) => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const { cx, cy, value } = props as any;
                          if (!value) return <g key={`d${cx}`} />;
                          return <g key={`d${cx}`}><circle cx={cx} cy={cy} r={4} fill="var(--sage)" stroke="#fff" strokeWidth={1.5} /></g>;
                        }}
                        activeDot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 12, marginTop: 6, marginBottom: 16, fontSize: 9, color: "var(--ink-muted)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 14, height: 2, background: "var(--sky)", borderRadius: 1 }} />実績</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 14, height: 0, borderTop: "1.5px dashed var(--ink-faint)" }} />予測</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 14, height: 0, borderTop: "1px dashed var(--sage)" }} />目標70%</div>
                  </div>

                </>
              )}

              {memoRecords.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                    学習メモ ({memoRecords.length}件)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {memoRecords.map((r, i) => {
                      const dateStr = new Date(r.date).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
                      const timeStr = new Date(r.date).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
                      return (
                        <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: "var(--bg-elevated)", borderLeft: "3px solid var(--sky)" }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: (r.memo || r.rangeNote) ? 6 : 0, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sky)" }}>{dateStr}</span>
                            <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>{timeStr}</span>
                            {r.hours && <span style={{ fontSize: 10, color: "var(--ink-muted)" }}>{r.hours}h</span>}
                            {r.isReview != null && (
                              <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: r.isReview ? "var(--sky-light)" : "var(--sage-light)", color: r.isReview ? "var(--sky)" : "var(--sage)" }}>
                                {r.isReview ? "復習" : "新規"}
                              </span>
                            )}
                          </div>
                          {r.rangeNote && <div style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: r.memo ? 4 : 0 }}>範囲: {r.rangeNote}</div>}
                          {r.memo && <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.6 }}>{r.memo}</div>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {!openStudied && memoRecords.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--ink-muted)", fontSize: 13, padding: "24px 0" }}>
                  まだ学習記録がありません
                </div>
              )}

              {/* ── 通知設定展開（経過日数シートのみ） ── */}
              {openFromDays && reminderTopicId === openTopicId && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-muted)" }}>いつ復習する？</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {([{ label: "1分後（テスト）", mins: 1, days: null }, { label: "明日", mins: null, days: 1 }, { label: "1週間後", mins: null, days: 7 }, { label: "3週間後", mins: null, days: 21 }, { label: "1ヶ月後", mins: null, days: 30 }] as { label: string; mins: number | null; days: number | null }[]).map(opt => (
                      <button key={opt.label} onClick={() => {
                        const iso = opt.mins != null
                          ? new Date(Date.now() + opt.mins * 60000).toISOString()
                          : addDays(opt.days!);
                        saveReminder(openTopicId!, openTopic!.name, iso);
                      }}
                        style={{ padding: "10px", borderRadius: 8, background: opt.mins != null ? "var(--amber-light)" : "var(--bg-elevated)", border: `1.5px solid ${opt.mins != null ? "var(--amber-border)" : "var(--line-md)"}`, cursor: "pointer", fontSize: 12, fontWeight: 700, color: opt.mins != null ? "var(--amber)" : "var(--ink)" }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {showCustomDate ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="date" value={reminderDate} min={new Date().toISOString().slice(0,10)}
                        onChange={e => setReminderDate(e.target.value)}
                        style={{ flex: 1, padding: "9px 10px", borderRadius: 8, border: "1.5px solid var(--line-md)", fontSize: 13, background: "var(--bg-card)", color: "var(--ink)", outline: "none" }} />
                      <button onClick={() => reminderDate && saveReminder(openTopicId!, openTopic!.name, new Date(reminderDate + "T08:00:00").toISOString())}
                        disabled={!reminderDate}
                        style={{ padding: "9px 14px", borderRadius: 8, background: reminderDate ? "var(--sky)" : "var(--bg-elevated)", color: reminderDate ? "#fff" : "var(--ink-faint)", border: "none", cursor: reminderDate ? "pointer" : "default", fontWeight: 700, fontSize: 12 }}>設定</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowCustomDate(true)}
                      style={{ width: "100%", padding: "9px", borderRadius: 8, background: "none", border: "1.5px dashed var(--line-md)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--ink-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                      <CalendarDays size={13} strokeWidth={1.8} />カレンダーから選ぶ
                    </button>
                  )}
                  <button onClick={() => { setReminderTopicId(null); setShowCustomDate(false); setReminderDate(""); }}
                    style={{ width: "100%", padding: "8px", borderRadius: 8, background: "none", border: "1.5px solid var(--line-md)", cursor: "pointer", fontSize: 11, color: "var(--ink-muted)" }}>キャンセル</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
