"use client";

import { useState } from "react";
import { AppState, StudyRecord, StudyReminder } from "@/lib/types";
import { getEffectiveSubjects } from "@/lib/examData";
import { ArrowLeft, Bell, BellOff, ChevronDown } from "lucide-react";

interface Props {
  state: AppState;
  onBack: () => void;
  onSaveReminders?: (reminders: StudyReminder[]) => void;
}

// ─── 経過日数ヒートマップの色（水色→赤） ────────────────
const dayColor = (days: number | null): { bg: string; text: string; border: string } => {
  if (days === null) return { bg: "var(--bg-elevated)", text: "var(--ink-faint)", border: "var(--line)" };
  if (days === 0)   return { bg: "#BAE6FD", text: "#0369A1", border: "#7DD3FC" }; // 今日
  if (days <= 3)    return { bg: "#7DD3FC", text: "#0369A1", border: "#38BDF8" }; // 3日以内
  if (days <= 7)    return { bg: "#A7F3D0", text: "#065F46", border: "#6EE7B7" }; // 1週間以内
  if (days <= 14)   return { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" }; // 2週間以内
  if (days <= 30)   return { bg: "#FED7AA", text: "#9A3412", border: "#FDBA74" }; // 1ヶ月以内
  if (days <= 60)   return { bg: "#FECACA", text: "#991B1B", border: "#FCA5A5" }; // 2ヶ月以内
  return                 { bg: "#FCA5A5", text: "#7F1D1D", border: "#F87171" };   // 危険
};

const dayLabel = (days: number | null): string => {
  if (days === null) return "未学習";
  if (days === 0)    return "今日";
  if (days === 1)    return "昨日";
  return `${days}日前`;
};

// studyRecords のみから最終学習日を取得（模試データは除外）
const getDaysSince = (topicId: string, studyRecords: StudyRecord[]): number | null => {
  const recs = studyRecords.filter(r => r.topicId === topicId);
  if (recs.length === 0) return null;
  const latest = Math.max(...recs.map(r => new Date(r.date).getTime()));
  return Math.floor((Date.now() - latest) / 86400000);
};

export default function Heatmap({ state, onBack, onSaveReminders }: Props) {
  const { examConfig, topicProgress } = state;
  if (!examConfig) return null;

  const subjects   = getEffectiveSubjects(examConfig.type, state);
  const [selectedSubject, setSelectedSubject] = useState(subjects[0].id);
  const [openTopicId, setOpenTopicId] = useState<string | null>(null);

  // リマインダー設定UI
  const [reminderTopicId, setReminderTopicId] = useState<string | null>(null);
  const [reminderDate,    setReminderDate]    = useState("");
  const reminders = state.reminders ?? [];

  const todayStr = new Date().toISOString().slice(0, 10);
  const testDateStr = new Date(Date.now() + 60000).toISOString(); // 1分後

  const requestPermission = async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    const p = await Notification.requestPermission();
    return p === "granted";
  };

  const setReminder = async (topicId: string, topicName: string, subjectName: string, isoDate: string) => {
    const granted = await requestPermission();
    const newReminder: StudyReminder = {
      id: `rem_${Date.now()}`,
      topicId, topicName, subjectName,
      scheduledAt: isoDate,
    };
    const next = [...reminders.filter(r => r.topicId !== topicId), newReminder];
    onSaveReminders?.(next);
    if (granted) {
      alert(`「${topicName}」のリマインダーを設定しました。\nアプリを開いたときに通知されます。`);
    } else {
      alert(`リマインダーを設定しました。\n※ブラウザの通知を許可すると通知が届きます。`);
    }
    setReminderTopicId(null);
    setReminderDate("");
  };

  const clearReminder = (topicId: string) => {
    onSaveReminders?.(reminders.filter(r => r.topicId !== topicId));
  };

  const currentSubject = subjects.find((s) => s.id === selectedSubject)!;

  const card: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1.5px solid var(--line-md)",
    borderRadius: 10,
    boxShadow: "var(--shadow-card)",
  };

  // ─── 危険論点（14日以上手つかず）のリスト ───────────────
  const dangerTopics = subjects.flatMap(s =>
    s.topics
      .map(t => ({
        subjectName: s.name,
        topicName:   t.name,
        days:        getDaysSince(t.id, state.studyRecords),
      }))
      .filter(x => x.days !== null && x.days > 14)
      .sort((a, b) => (b.days ?? 0) - (a.days ?? 0))
  ).slice(0, 5);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>

      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "22px 20px 16px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          <ArrowLeft size={18} strokeWidth={1.6} color="var(--ink-muted)" />
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>論点ヒートマップ（経過日数）</span>
      </div>

      <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* 危険論点コメント */}
        {dangerTopics.length > 0 && (
          <div style={{
            padding: "12px 14px", borderRadius: 10,
            background: "var(--terra-light)", border: "1px solid var(--terra-border)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--terra)", marginBottom: 8 }}>
              ⚠️ 最近手薄な論点
            </div>
            {dangerTopics.map((t, i) => (
              <div key={i} style={{
                fontSize: 12, color: "var(--terra)", marginBottom: i < dangerTopics.length - 1 ? 4 : 0,
                display: "flex", justifyContent: "space-between",
              }}>
                <span><span style={{ opacity: 0.6 }}>{t.subjectName} › </span>{t.topicName}が最近手薄だよ</span>
                <span style={{ fontWeight: 700, whiteSpace: "nowrap", marginLeft: 8 }}>{t.days}日前</span>
              </div>
            ))}
          </div>
        )}

        {/* 凡例 */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "var(--ink-muted)", flexWrap: "wrap" }}>
          <span>最近</span>
          {[
            { bg: "var(--bg-elevated)" },
            { bg: "#BAE6FD" }, { bg: "#7DD3FC" }, { bg: "#A7F3D0" },
            { bg: "#FEF3C7" }, { bg: "#FED7AA" }, { bg: "#FECACA" }, { bg: "#FCA5A5" },
          ].map((c, i) => (
            <div key={i} style={{ width: 14, height: 10, borderRadius: 2, background: c.bg, border: "1px solid var(--line)" }} />
          ))}
          <span>危険</span>
        </div>

        {/* 科目タブ */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSelectedSubject(s.id); setOpenTopicId(null); }}
              style={{
                flexShrink: 0, padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: selectedSubject === s.id ? "var(--ink)" : "var(--bg-card)",
                color: selectedSubject === s.id ? "#FAF9F6" : "var(--ink-muted)",
                border: selectedSubject === s.id ? "none" : "1.5px solid var(--line-md)",
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* 論点リスト */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {currentSubject.topics.map((topic) => {
            const progress = topicProgress[topic.id];
            const studied  = (progress?.studyCount ?? 0) > 0;
            const isOpen   = openTopicId === topic.id;

            const days = getDaysSince(topic.id, state.studyRecords);
            const { bg, text, border } = dayColor(days);
            const allRecords = state.studyRecords
              .filter(r => r.topicId === topic.id)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5);

            return (
              <div key={topic.id} style={{ ...card, overflow: "hidden", borderColor: isOpen ? border : "var(--line-md)" }}>
                <button
                  onClick={() => setOpenTopicId(isOpen ? null : topic.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 14px", background: isOpen ? bg : "var(--bg-card)",
                    border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.2s",
                  }}
                >
                  {/* 経過日数バッジ */}
                  <div style={{
                    width: 52, height: 44, borderRadius: 8, flexShrink: 0,
                    background: bg, border: `1.5px solid ${border}`,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  }}>
                    {days === null ? (
                      <div style={{ fontSize: 10, color: text }}>未学習</div>
                    ) : days === 0 ? (
                      <div style={{ fontSize: 11, fontWeight: 800, color: text }}>今日</div>
                    ) : days === 1 ? (
                      <div style={{ fontSize: 11, fontWeight: 800, color: text }}>昨日</div>
                    ) : (
                      <>
                        <div style={{ fontSize: 16, fontWeight: 800, color: text, lineHeight: 1 }}>{days}</div>
                        <div style={{ fontSize: 8, color: text, opacity: 0.7 }}>日前</div>
                      </>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {topic.name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--ink-muted)", marginTop: 2, display: "flex", gap: 8 }}>
                      <span>{"★".repeat(topic.weight)}{"☆".repeat(5 - topic.weight)}</span>
                      {studied && <span>{progress.studyCount}回</span>}
                      {days !== null && days > 14 && <span style={{ color: "var(--terra)", fontWeight: 600 }}>手薄</span>}
                    </div>
                  </div>
                  <ChevronDown size={14} strokeWidth={1.6} color="var(--ink-faint)"
                    style={{ flexShrink: 0, transition: "transform 0.25s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                </button>

                {isOpen && (
                  <div style={{ borderTop: `1px solid ${border}`, padding: "12px 14px" }}>

                    {/* ── リマインダー設定 ── */}
                    {(() => {
                      const existing = reminders.find(r => r.topicId === topic.id);
                      const isSettingThis = reminderTopicId === topic.id;
                      const subjectName = currentSubject.name;
                      return (
                        <div style={{ marginBottom: 12 }}>
                          {existing ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "var(--sky-light)", border: "1px solid var(--sky-border)" }}>
                              <Bell size={13} strokeWidth={1.8} color="var(--sky)" />
                              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--sky)" }}>
                                {new Date(existing.scheduledAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} に通知予定
                              </span>
                              <button onClick={() => clearReminder(topic.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--sky)", fontWeight: 600, padding: "2px 6px" }}>解除</button>
                            </div>
                          ) : isSettingThis ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", borderRadius: 8, background: "var(--bg-elevated)", border: "1px solid var(--line-md)" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-muted)" }}>復習リマインダーを設定</div>
                              <input
                                type="date"
                                min={todayStr}
                                value={reminderDate}
                                onChange={e => setReminderDate(e.target.value)}
                                style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1.5px solid var(--line-md)", fontSize: 14, background: "var(--bg-card)", color: "var(--ink)", outline: "none" }}
                              />
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  onClick={() => reminderDate && setReminder(topic.id, topic.name, subjectName, new Date(reminderDate + "T08:00:00").toISOString())}
                                  disabled={!reminderDate}
                                  style={{ flex: 1, padding: "9px", borderRadius: 8, background: reminderDate ? "var(--sky)" : "var(--bg-elevated)", color: reminderDate ? "#fff" : "var(--ink-faint)", border: "none", cursor: reminderDate ? "pointer" : "default", fontWeight: 700, fontSize: 13 }}
                                >
                                  設定する
                                </button>
                                <button
                                  onClick={() => setReminder(topic.id, topic.name, subjectName, testDateStr)}
                                  style={{ padding: "9px 12px", borderRadius: 8, background: "var(--bg-elevated)", border: "1.5px solid var(--line-md)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--ink-muted)" }}
                                >
                                  1分後（テスト）
                                </button>
                                <button onClick={() => { setReminderTopicId(null); setReminderDate(""); }} style={{ padding: "9px 10px", borderRadius: 8, background: "none", border: "1.5px solid var(--line-md)", cursor: "pointer", fontSize: 11, color: "var(--ink-faint)" }}>
                                  キャンセル
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setReminderTopicId(topic.id); setReminderDate(""); }}
                              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, background: "var(--bg-elevated)", border: "1.5px dashed var(--line-md)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", width: "100%" }}
                            >
                              <Bell size={13} strokeWidth={1.8} />
                              復習リマインダーを設定
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── 学習記録（数値のみ） ── */}
                    {allRecords.length === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--ink-muted)", textAlign: "center", padding: "4px 0" }}>
                        まだ学習記録がありません
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {allRecords.map((r, i) => {
                          const dateStr = new Date(r.date).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 7, background: "var(--bg-elevated)", borderLeft: `3px solid ${border}` }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: text, flexShrink: 0 }}>{dateStr}</span>
                              {r.hours != null && <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{r.hours}h</span>}
                              {r.understanding != null && <span style={{ fontSize: 11, color: "var(--sky)", fontWeight: 600 }}>理解{r.understanding}%</span>}
                              {r.pageFrom != null && r.pageTo != null && <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>p.{r.pageFrom}–{r.pageTo}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
