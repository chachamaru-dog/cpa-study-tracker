"use client";

import { useState, useRef } from "react";
import { AppState, CustomTopic, StudyMethod, STUDY_METHOD_META, Textbook } from "@/lib/types";
import { getEffectiveSubjects } from "@/lib/examData";
import {
  ArrowLeft, BookOpen, Headphones, PenLine, Pencil, ScrollText, MessageSquare, Plus, X, Check,
} from "lucide-react";

// ─── デュアルレンジスライダー ──────────────────────────────
// タッチ/マウスでどちらのハンドルでも自由に動かせる1本のバー
function DualRangeSlider({
  min, max, from, to,
  onFromChange, onToChange,
}: {
  min: number; max: number;
  from: number; to: number;
  onFromChange: (v: number) => void;
  onToChange: (v: number) => void;
}) {
  const trackRef    = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<"from" | "to" | null>(null);

  const getVal = (clientX: number): number => {
    const rect  = trackRef.current!.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(min + ratio * (max - min));
  };

  const startDrag = (clientX: number) => {
    const val      = getVal(clientX);
    const fromDist = Math.abs(val - from);
    const toDist   = Math.abs(val - to);
    draggingRef.current = fromDist <= toDist ? "from" : "to";
    applyDrag(val);
  };

  const applyDrag = (val: number) => {
    if (draggingRef.current === "from") {
      onFromChange(Math.max(min, Math.min(val, to - 1)));
    } else if (draggingRef.current === "to") {
      onToChange(Math.min(max, Math.max(val, from + 1)));
    }
  };

  const moveDrag  = (clientX: number) => { if (draggingRef.current) applyDrag(getVal(clientX)); };
  const endDrag   = () => { draggingRef.current = null; };

  const fromPct = (from - min) / Math.max(1, max - min) * 100;
  const toPct   = (to   - min) / Math.max(1, max - min) * 100;

  return (
    <div
      ref={trackRef}
      style={{ position: "relative", height: 48, cursor: "pointer", userSelect: "none", touchAction: "none" }}
      onMouseDown={e => startDrag(e.clientX)}
      onMouseMove={e => moveDrag(e.clientX)}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={e => { e.preventDefault(); startDrag(e.touches[0].clientX); }}
      onTouchMove={e => { e.preventDefault(); moveDrag(e.touches[0].clientX); }}
      onTouchEnd={endDrag}
    >
      {/* 背景トラック */}
      <div style={{
        position: "absolute", top: "50%", left: 0, right: 0,
        height: 6, borderRadius: 3, background: "var(--bg-elevated)",
        transform: "translateY(-50%)", pointerEvents: "none",
      }} />
      {/* 選択範囲ハイライト */}
      <div style={{
        position: "absolute", top: "50%",
        left: `${fromPct}%`, width: `${toPct - fromPct}%`,
        height: 6, borderRadius: 3, background: "var(--sky)",
        transform: "translateY(-50%)", pointerEvents: "none",
      }} />
      {/* From ハンドル */}
      <div style={{
        position: "absolute", top: "50%", left: `${fromPct}%`,
        width: 26, height: 26, borderRadius: "50%",
        background: "white", border: "3px solid var(--sky)",
        transform: "translate(-50%, -50%)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)", pointerEvents: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--sky)" }} />
      </div>
      {/* To ハンドル */}
      <div style={{
        position: "absolute", top: "50%", left: `${toPct}%`,
        width: 26, height: 26, borderRadius: "50%",
        background: "white", border: "3px solid var(--sky)",
        transform: "translate(-50%, -50%)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)", pointerEvents: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--sky)" }} />
      </div>
    </div>
  );
}

const METHOD_ICONS: Record<StudyMethod, React.FC<{ size?: number; strokeWidth?: number; color?: string }>> = {
  text_reading:  BookOpen,
  audio_lecture: Headphones,
  summary_note:  PenLine,
  practice:      Pencil,
  past_exam:     ScrollText,
  oral:          MessageSquare,
};

export interface StudySession {
  subjectId:     string;
  topicId:       string;
  method:        StudyMethod;
  hours:         number;
  understanding?: number;
  isReview:       boolean;
  coveragePct:   number;
  rangeNote:     string;
  memo:          string;
  textbookId?:   string;
  pageFrom?:     number;
  pageTo?:       number;
  newTextbook?:  { name: string; totalPages: number };
}

interface Props {
  state:               AppState;
  onApply:             (session: StudySession) => void;
  onBack:              () => void;
  onUpdateTextbooks?:  (textbooks: Textbook[]) => void;
  onSaveTopicConfig?:  (overrides: Record<string, string>, customTopics: CustomTopic[]) => void;
}

const HOUR_OPTIONS = [
  { label: "30分",   value: 0.5 },
  { label: "1時間",  value: 1   },
  { label: "1.5h",   value: 1.5 },
  { label: "2時間",  value: 2   },
  { label: "3時間",  value: 3   },
  { label: "4時間",  value: 4   },
  { label: "5時間",  value: 5   },
  { label: "6時間",  value: 6   },
  { label: "8時間",  value: 8   },
  { label: "10時間", value: 10  },
  { label: "12時間", value: 12  },
  { label: "12h+",   value: 13  },
];



// カバレッジ%
const COVERAGE_OPTIONS = [
  { value: 10,  label: "10%",  desc: "ちょっと触った" },
  { value: 25,  label: "25%",  desc: "4分の1くらい"   },
  { value: 50,  label: "50%",  desc: "半分くらい"      },
  { value: 75,  label: "75%",  desc: "4分の3くらい"   },
  { value: 100, label: "100%", desc: "全部やった"       },
];

const METHOD_OPTIONS = Object.entries(STUDY_METHOD_META) as [StudyMethod, typeof STUDY_METHOD_META[StudyMethod]][];

// 科目ごとのカラーパレット
const PALETTE = [
  { bg: "var(--sky-light)",      border: "var(--sky-border)",      text: "var(--sky)"      },
  { bg: "var(--lavender-light)", border: "var(--lavender-border)", text: "var(--lavender)" },
  { bg: "var(--sage-light)",     border: "var(--sage-border)",     text: "var(--sage)"     },
  { bg: "var(--terra-light)",    border: "var(--terra-border)",    text: "var(--terra)"    },
  { bg: "var(--amber-light)",    border: "var(--amber-border)",    text: "var(--amber)"    },
];

export default function NaturalInput({ state, onApply, onBack, onUpdateTextbooks, onSaveTopicConfig }: Props) {
  const { examConfig } = state;
  if (!examConfig) return null;

  const subjects = getEffectiveSubjects(examConfig.type, state);

  const [step,          setStep]          = useState(0);
  const [subjectId,     setSubjectId]     = useState<string | null>(null);
  const [topicId,       setTopicId]       = useState<string | null>(null);
  const [method,        setMethod]        = useState<StudyMethod | null>(null);
  const [hours,         setHours]         = useState<number | null>(null);
  const [coveragePct,   setCoveragePct]   = useState<number | null>(null);
  const [understanding, setUnderstanding] = useState<number | null>(null);
  const [memo,          setMemo]          = useState("");
  const [done,          setDone]          = useState(false);

  // 記録方法分岐: "memo" | "page" | null
  const [recordMode,    setRecordMode]    = useState<"memo" | "page" | null>(null);

  // テキスト/ページ範囲関連
  const [selectedTbId,  setSelectedTbId]  = useState<string | null>(null);
  const [pageFrom,      setPageFrom]      = useState(1);
  const [pageTo,        setPageTo]        = useState(1);
  const [newTbName,     setNewTbName]     = useState("");
  const [newTbPages,    setNewTbPages]    = useState("");

  // テキスト編集
  const [editingTbId,   setEditingTbId]   = useState<string | null>(null);
  const [editTbName,    setEditTbName]    = useState("");
  const [editTbPages,   setEditTbPages]   = useState("");

  // 論点名編集モード
  const [topicEditOpen,  setTopicEditOpen]  = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTopicDraft, setEditTopicDraft] = useState("");
  const [addingTopic,    setAddingTopic]    = useState(false);
  const [newTopicName,   setNewTopicName]   = useState("");

  const TOTAL_STEPS = 7;

  const selectedSubject  = subjects.find(s => s.id === subjectId);
  const selectedTopic    = selectedSubject?.topics.find(t => t.id === topicId);
  const selectedMethod   = method ? STUDY_METHOD_META[method] : null;

  const handleDone = () => {
    if (!subjectId || !topicId || !method || !hours) return;

    // テキスト+ページ範囲からcoveragePctを自動計算
    let effectiveCoveragePct = 100;
    let sessionTextbookId: string | undefined;
    let sessionPageFrom: number | undefined;
    let sessionPageTo: number | undefined;
    let newTextbook: { name: string; totalPages: number } | undefined;

    if (selectedTbId === "new" && newTbName.trim() && newTbPages.trim()) {
      const tp = parseInt(newTbPages);
      if (tp > 0) {
        newTextbook = { name: newTbName.trim(), totalPages: tp };
        sessionPageFrom = pageFrom;
        sessionPageTo   = pageTo;
        effectiveCoveragePct = Math.round((pageTo - pageFrom + 1) / tp * 100);
      }
    } else if (selectedTbId) {
      const tb = (state.textbooks ?? []).find(t => t.id === selectedTbId);
      if (tb) {
        sessionTextbookId    = tb.id;
        sessionPageFrom      = pageFrom;
        sessionPageTo        = pageTo;
        effectiveCoveragePct = Math.round((pageTo - pageFrom + 1) / tb.totalPages * 100);
      }
    }

    const effectiveUnderstanding = understanding ?? undefined;

    onApply({
      subjectId, topicId, method, hours,
      understanding: effectiveUnderstanding,
      isReview:    false,
      coveragePct: Math.min(100, Math.max(1, effectiveCoveragePct)),
      rangeNote:   "",
      memo,
      textbookId:  sessionTextbookId,
      pageFrom:    sessionPageFrom,
      pageTo:      sessionPageTo,
      newTextbook,
    });
    setDone(true);
    setTimeout(() => {
      setDone(false); setStep(0);
      setSubjectId(null); setTopicId(null);
      setMethod(null); setHours(null);
      setCoveragePct(null); setUnderstanding(null); setMemo(""); setRecordMode(null);

      setSelectedTbId(null); setPageFrom(1); setPageTo(1); setNewTbName(""); setNewTbPages("");
      setEditingTbId(null); setEditTbName(""); setEditTbPages("");
    }, 1800);
  };

  const goBack = () => step === 0 ? onBack() : setStep(s => s - 1);

  /* ── 記録完了画面 ── */
  if (done) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "var(--sage)",
          opacity: 0.25,
        }} />
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", marginTop: -44 }}>記録完了</div>
        <div style={{ fontSize: 13, color: "var(--ink-muted)", textAlign: "center", lineHeight: 1.7 }}>
          {selectedSubject?.name}
          {selectedTopic ? ` · ${selectedTopic.name}` : ""}<br />
          {hours ? `${hours}h` : ""}
        </div>
      </div>
    );
  }

  /* ── 共通ラッパー ── */
  const wrapStyle: React.CSSProperties = {
    minHeight: "100vh", background: "var(--bg)", maxWidth: 480,
    margin: "0 auto", paddingBottom: 120,
  };

  /* ── ヘッダー ── */
  const Header = () => (
    <div style={{ padding: "22px 20px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          <ArrowLeft size={18} strokeWidth={1.6} color="var(--ink-muted)" />
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>今日の学習を記録</div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-muted)", fontFamily: "var(--font-en)" }}>
          {step + 1} / {TOTAL_STEPS}
        </div>
      </div>
      {/* プログレスバー */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= step ? "var(--ink)" : "var(--bg-elevated)",
            transition: "background 0.3s",
          }} />
        ))}
      </div>
      {/* パンくず */}
      {(subjectId || topicId) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {selectedSubject && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
              background: PALETTE[subjects.indexOf(selectedSubject) % PALETTE.length].bg,
              color:      PALETTE[subjects.indexOf(selectedSubject) % PALETTE.length].text,
              border:     `1px solid ${PALETTE[subjects.indexOf(selectedSubject) % PALETTE.length].border}`,
            }}>{selectedSubject.name}</span>
          )}
          {selectedTopic && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
              background: "var(--bg-elevated)", color: "var(--ink-muted)", border: "1px solid var(--line-md)",
            }}>{selectedTopic.name}</span>
          )}
          {selectedMethod && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
              background: "var(--bg-elevated)", color: "var(--ink-muted)", border: "1px solid var(--line-md)",
            }}>{selectedMethod.label}</span>
          )}
          {hours && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
              background: "var(--bg-elevated)", color: "var(--ink-muted)", border: "1px solid var(--line-md)",
            }}>{hours}h</span>
          )}
        </div>
      )}
    </div>
  );

  const Q = ({ title, sub }: { title: string; sub: string }) => (
    <div style={{ padding: "0 20px 20px" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>{sub}</div>
    </div>
  );

  /* ── Step 0: 科目選択 ── */
  if (step === 0) return (
    <div style={wrapStyle}>
      <Header />
      <Q title="どの科目をやった？" sub="今日勉強した科目を選んでください" />
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {subjects.map((s, i) => {
          const p = PALETTE[i % PALETTE.length];
          return (
            <button key={s.id} onClick={() => { setSubjectId(s.id); setStep(1); }}
              style={{
                width: "100%", textAlign: "left", padding: "16px 20px",
                background: p.bg, border: `2px solid ${p.border}`,
                borderRadius: 12, cursor: "pointer",
                fontSize: 15, fontWeight: 700, color: p.text,
                transition: "opacity 0.15s",
              }}
            >
              {s.name}
            </button>
          );
        })}
      </div>
    </div>
  );

  /* ── Step 1: 論点選択 ── */
  if (step === 1 && selectedSubject) {
    const subIdx = subjects.indexOf(selectedSubject);
    const p = PALETTE[subIdx % PALETTE.length];

    const saveTopicName = (topicId: string, name: string) => {
      if (!name.trim()) return;
      const overrides = { ...(state.topicNameOverrides ?? {}), [topicId]: name.trim() };
      onSaveTopicConfig?.(overrides, state.customTopics ?? []);
      setEditingTopicId(null);
    };

    const addCustomTopic = () => {
      if (!newTopicName.trim() || !subjectId) return;
      const newTopic: CustomTopic = {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        subjectId,
        name: newTopicName.trim(),
        weight: 3,
      };
      onSaveTopicConfig?.(state.topicNameOverrides ?? {}, [...(state.customTopics ?? []), newTopic]);
      setNewTopicName("");
      setAddingTopic(false);
    };

    const deleteTopic = (topicId: string) => {
      const customs = (state.customTopics ?? []).filter(ct => ct.id !== topicId);
      onSaveTopicConfig?.(state.topicNameOverrides ?? {}, customs);
    };

    return (
      <div style={wrapStyle}>
        <Header />

        {/* タイトル行 + 編集ボタン */}
        <div style={{ padding: "0 20px 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>どの論点をやった？</div>
            <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>該当する論点を選んでください</div>
          </div>
          <button
            onClick={() => setTopicEditOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 8, background: "var(--bg-elevated)", border: "1.5px solid var(--line-md)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", flexShrink: 0, marginTop: 2 }}
          >
            <Pencil size={13} strokeWidth={1.8} />
            論点名を編集・追加する
          </button>
        </div>

        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {selectedSubject.topics.map(t => (
            <button key={t.id} onClick={() => { setTopicId(t.id); setStep(2); }}
              style={{
                width: "100%", textAlign: "left", padding: "13px 16px",
                background: "var(--bg-card)", border: `1.5px solid var(--line-md)`,
                borderLeft: `4px solid ${p.text}`,
                borderRadius: 10, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                transition: "background 0.15s",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{t.name}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                background: p.bg, color: p.text, border: `1px solid ${p.border}`,
                flexShrink: 0, marginLeft: 8,
              }}>★{t.weight}</span>
            </button>
          ))}
        </div>

        {/* ── 論点編集オーバーレイ ── */}
        {topicEditOpen && (
          <>
            <div onClick={() => { setTopicEditOpen(false); setEditingTopicId(null); setAddingTopic(false); }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200 }} />
            <div style={{
              position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
              width: "100%", maxWidth: 480,
              background: "var(--bg-card)", borderRadius: "16px 16px 0 0",
              boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
              zIndex: 201, maxHeight: "80vh", display: "flex", flexDirection: "column",
            }}>
              {/* ハンドル */}
              <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 0" }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--line-md)" }} />
              </div>
              {/* ヘッダー */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px 8px" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>論点名を編集・追加する</span>
                <button onClick={() => { setTopicEditOpen(false); setEditingTopicId(null); setAddingTopic(false); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
                  <X size={18} strokeWidth={1.8} color="var(--ink-muted)" />
                </button>
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-muted)", padding: "0 18px 12px" }}>
                {selectedSubject.name}
              </div>

              {/* 論点リスト */}
              <div style={{ overflowY: "auto", padding: "0 14px 24px", display: "flex", flexDirection: "column", gap: 6 }}>
                {selectedSubject.topics.map(t => {
                  const isCustom = (state.customTopics ?? []).some(ct => ct.id === t.id);
                  const isEditing = editingTopicId === t.id;
                  return (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "var(--bg-elevated)", border: "1.5px solid var(--line-md)" }}>
                      {isEditing ? (
                        <>
                          <input
                            autoFocus
                            value={editTopicDraft}
                            onChange={e => setEditTopicDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") saveTopicName(t.id, editTopicDraft); if (e.key === "Escape") setEditingTopicId(null); }}
                            style={{ flex: 1, fontSize: 14, fontWeight: 600, border: "1.5px solid var(--sky)", borderRadius: 6, padding: "4px 8px", background: "var(--bg-card)", color: "var(--ink)", outline: "none" }}
                          />
                          <button onClick={() => saveTopicName(t.id, editTopicDraft)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}>
                            <Check size={16} strokeWidth={2} color="var(--sage)" />
                          </button>
                          <button onClick={() => setEditingTopicId(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}>
                            <X size={16} strokeWidth={1.8} color="var(--ink-faint)" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{t.name}</span>
                          <button onClick={() => { setEditingTopicId(t.id); setEditTopicDraft(t.name); }}
                            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}>
                            <Pencil size={14} strokeWidth={1.8} color="var(--ink-muted)" />
                          </button>
                          {isCustom && (
                            <button onClick={() => deleteTopic(t.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}>
                              <X size={14} strokeWidth={1.8} color="var(--terra)" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}

                {/* 論点追加 */}
                {addingTopic ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "var(--sky-light)", border: "1.5px solid var(--sky-border)" }}>
                    <input
                      autoFocus
                      placeholder="論点名を入力"
                      value={newTopicName}
                      onChange={e => setNewTopicName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addCustomTopic(); if (e.key === "Escape") setAddingTopic(false); }}
                      style={{ flex: 1, fontSize: 14, fontWeight: 600, border: "1.5px solid var(--sky)", borderRadius: 6, padding: "4px 8px", background: "var(--bg-card)", color: "var(--ink)", outline: "none" }}
                    />
                    <button onClick={addCustomTopic} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}>
                      <Check size={16} strokeWidth={2} color="var(--sage)" />
                    </button>
                    <button onClick={() => { setAddingTopic(false); setNewTopicName(""); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}>
                      <X size={16} strokeWidth={1.8} color="var(--ink-faint)" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTopic(true)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", borderRadius: 10, border: "1.5px dashed var(--line-md)", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--ink-muted)" }}
                  >
                    <Plus size={14} strokeWidth={2} />
                    論点を追加
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── Step 2: 学習方法 ── */
  if (step === 2) return (
    <div style={wrapStyle}>
      <Header />
      <Q title="何をやった？" sub="学習方法を選んでください" />
      <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {METHOD_OPTIONS.map(([m, meta]) => {
          const isInput = meta.type === "input";
          const Icon = METHOD_ICONS[m];
          return (
            <button key={m} onClick={() => { setMethod(m); setStep(3); }}
              style={{
                padding: "16px 14px", textAlign: "left",
                background: isInput ? "var(--lavender-light)" : "var(--sage-light)",
                border: `1.5px solid ${isInput ? "var(--lavender-border)" : "var(--sage-border)"}`,
                borderRadius: 12, cursor: "pointer", transition: "opacity 0.15s",
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <Icon size={18} strokeWidth={1.4} color={isInput ? "var(--lavender)" : "var(--sage)"} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{meta.label}</div>
              <div style={{ fontSize: 10, color: isInput ? "var(--lavender)" : "var(--sage)", fontWeight: 600 }}>
                {isInput ? "インプット" : "アウトプット"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* ── Step 3: 時間 ── */
  if (step === 3) return (
    <div style={wrapStyle}>
      <Header />
      <Q title="何時間やった？" sub="今日の学習時間を選んでください" />
      <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {HOUR_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => { setHours(opt.value); setStep(4); }}
            style={{
              padding: "16px 8px", textAlign: "center",
              background: "var(--bg-card)", border: "1.5px solid var(--line-md)",
              borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--ink)",
              transition: "border-color 0.15s",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  /* ── Step 4: どのくらい理解できた？（スライダー） ── */
  if (step === 4) {
    const sliderVal = understanding ?? 70;
    const sliderColor = sliderVal >= 80 ? "var(--sage)" : sliderVal >= 55 ? "var(--sky)" : sliderVal >= 30 ? "var(--amber)" : "var(--terra)";
    const sliderLabel = sliderVal >= 80 ? "かなり理解できた" : sliderVal >= 55 ? "まあまあ" : sliderVal >= 30 ? "少し" : "全然わからなかった";
    return (
      <div style={wrapStyle}>
        <Header />
        <Q title="どのくらい理解できた？" sub="スライダーで割合を選んでください" />
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* パーセント表示 */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, padding: "16px 0 8px" }}>
            <span style={{ fontSize: 56, fontWeight: 900, color: sliderColor, fontFamily: "var(--font-en)", lineHeight: 1 }}>{sliderVal}</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: sliderColor }}>%</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: sliderColor, marginLeft: 8 }}>{sliderLabel}</span>
          </div>

          {/* スライダー（太め） */}
          <div style={{ padding: "0 4px" }}>
            <input
              type="range" min={0} max={100} step={5}
              value={sliderVal}
              onChange={e => setUnderstanding(Number(e.target.value))}
              style={{ width: "100%", accentColor: sliderColor, height: 28, cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-muted)", marginTop: 4 }}>
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          <button
            onClick={() => setStep(5)}
            style={{ width: "100%", padding: "16px", borderRadius: 12, fontWeight: 700, fontSize: 15, background: sliderColor, color: "#fff", border: "none", cursor: "pointer" }}
          >
            次へ
          </button>
        </div>
      </div>
    );
  }

  /* ── Step 5: 記録方法 2択 ── */
  if (step === 5) return (
    <div style={wrapStyle}>
      <Header />
      <Q title="どうやって記録する？" sub="やり方を選んでください（任意）" />
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          {
            mode: "memo" as const,
            label: "やったことをメモする",
            sub: "テキストや問題集に関係なく自由に記録",
            color: "var(--sage)", bg: "var(--sage-light)", border: "var(--sage-border)",
          },
          {
            mode: "page" as const,
            label: "ページ数で記録する",
            sub: "テキストのページ範囲を正確に記録する",
            color: "var(--sky)", bg: "var(--sky-light)", border: "var(--sky-border)",
          },
        ].map(opt => (
          <button key={opt.mode}
            onClick={() => { setRecordMode(opt.mode); setStep(6); }}
            style={{
              width: "100%", textAlign: "left", padding: "18px 20px",
              background: opt.bg, border: `2px solid ${opt.border}`,
              borderRadius: 14, cursor: "pointer", transition: "opacity 0.15s",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: opt.color, marginBottom: 4 }}>{opt.label}</div>
            <div style={{ fontSize: 11, color: opt.color, opacity: 0.7 }}>{opt.sub}</div>
          </button>
        ))}

        {/* スキップして記録 */}
        <button
          onClick={handleDone}
          style={{
            width: "100%", padding: "14px", borderRadius: 12, cursor: "pointer",
            background: "none", border: "1.5px solid var(--line-md)",
            fontSize: 13, fontWeight: 600, color: "var(--ink-muted)",
            marginTop: 4,
          }}
        >
          スキップして記録する
        </button>
      </div>
    </div>
  );

  /* ── Step 6: 分岐先（メモ or ページ） ── */
  if (step === 6) {
    const textbooks = state.textbooks ?? [];

    // ── メモ分岐 ──
    if (recordMode === "memo") return (
      <div style={wrapStyle}>
        <Header />
        <Q title="やったことをメモする" sub="自由に記録してください" />
        <div style={{ padding: "0 16px" }}>
          <textarea
            autoFocus
            placeholder="例: 財務会計テキスト第3章を読んだ。キャッシュフロー計算書の間接法がまだ曖昧。"
            value={memo} onChange={e => setMemo(e.target.value)}
            rows={8}
            style={{
              width: "100%", padding: "14px", borderRadius: 10, boxSizing: "border-box",
              border: "1.5px solid var(--line-md)", background: "var(--bg-card)",
              color: "var(--ink)", fontSize: 13, lineHeight: 1.7, outline: "none", resize: "none",
            }}
          />
        </div>
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "rgba(250,249,246,0.94)", backdropFilter: "blur(16px)",
          borderTop: "1px solid var(--line)", padding: "14px 16px 28px", zIndex: 50,
        }}>
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <button onClick={handleDone} className="btn-main" style={{ width: "100%" }}>記録する</button>
          </div>
        </div>
      </div>
    );

    // ── ページ分岐 ──
    const selectTextbook = (id: string) => {
      setSelectedTbId(id);
      const tb = textbooks.find(t => t.id === id);
      if (tb) { setPageFrom(1); setPageTo(tb.totalPages); }
    };
    const newTbPagesNum = parseInt(newTbPages) || 0;
    const activeTb      = selectedTbId && selectedTbId !== "new" ? textbooks.find(t => t.id === selectedTbId) : null;
    const totalPages    = activeTb ? activeTb.totalPages : (selectedTbId === "new" && newTbPagesNum > 0 ? newTbPagesNum : 0);
    const sessionPages  = totalPages > 0 ? pageTo - pageFrom + 1 : 0;
    const sessionPct    = totalPages > 0 ? Math.round(sessionPages / totalPages * 100) : null;

    // テキスト編集を保存
    const saveEdit = () => {
      if (!editingTbId) return;
      const n = parseInt(editTbPages) || 0;
      if (!editTbName.trim() || n <= 0) return;
      const updated = textbooks.map(t => t.id === editingTbId ? { ...t, name: editTbName.trim(), totalPages: n } : t);
      onUpdateTextbooks?.(updated);
      if (selectedTbId === editingTbId) { setPageFrom(1); setPageTo(n); }
      setEditingTbId(null);
    };
    const deleteTb = (id: string) => {
      const updated = textbooks.filter(t => t.id !== id);
      onUpdateTextbooks?.(updated);
      if (selectedTbId === id) setSelectedTbId(null);
    };

    return (
      <div style={wrapStyle}>
        <Header />
        <Q title="ページ数で記録する" sub="テキストを選んでページ範囲を設定してください" />
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* テキスト一覧 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {textbooks.map(tb => (
              <div key={tb.id}>
                {/* テキスト行 */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 12px",
                  background: selectedTbId === tb.id ? "var(--sky-light)" : "var(--bg-card)",
                  border: `1.5px solid ${selectedTbId === tb.id ? "var(--sky-border)" : "var(--line-md)"}`,
                  borderRadius: editingTbId === tb.id ? "10px 10px 0 0" : 10,
                }}>
                  <button onClick={() => { selectTextbook(tb.id); setEditingTbId(null); }}
                    style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: selectedTbId === tb.id ? "var(--sky)" : "var(--ink)" }}>{tb.name}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-muted)" }}>全{tb.totalPages}p</div>
                  </button>
                  {/* 編集ボタン */}
                  <button onClick={() => {
                    if (editingTbId === tb.id) { setEditingTbId(null); return; }
                    setEditingTbId(tb.id); setEditTbName(tb.name); setEditTbPages(String(tb.totalPages));
                  }} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 13, color: "var(--ink-muted)" }}>
                    ✏️
                  </button>
                  {/* 削除ボタン */}
                  <button onClick={() => deleteTb(tb.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontSize: 13 }}>
                    🗑️
                  </button>
                </div>
                {/* インライン編集フォーム */}
                {editingTbId === tb.id && (
                  <div style={{
                    padding: "10px 12px", background: "var(--lavender-light)",
                    border: "1.5px solid var(--lavender-border)", borderTop: "none",
                    borderRadius: "0 0 10px 10px", display: "flex", flexDirection: "column", gap: 8,
                  }}>
                    <input type="text" value={editTbName} onChange={e => setEditTbName(e.target.value)}
                      placeholder="テキスト名"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, boxSizing: "border-box",
                        border: "1px solid var(--lavender-border)", background: "white", fontSize: 13, outline: "none", color: "var(--ink)" }} />
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="number" value={editTbPages} onChange={e => setEditTbPages(e.target.value)}
                        placeholder="総ページ数"
                        style={{ flex: 1, padding: "8px 10px", borderRadius: 6,
                          border: "1px solid var(--lavender-border)", background: "white", fontSize: 13, outline: "none", color: "var(--ink)" }} />
                      <span style={{ fontSize: 11, color: "var(--lavender)" }}>p</span>
                      <button onClick={saveEdit} className="btn-main" style={{ padding: "8px 16px", fontSize: 12 }}>保存</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 新規追加 */}
            <button onClick={() => { setSelectedTbId("new"); setPageFrom(1); setPageTo(1); setEditingTbId(null); }}
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                background: selectedTbId === "new" ? "var(--lavender-light)" : "var(--bg-card)",
                border: `1.5px dashed ${selectedTbId === "new" ? "var(--lavender-border)" : "var(--line-md)"}`,
                fontSize: 13, fontWeight: 600,
                color: selectedTbId === "new" ? "var(--lavender)" : "var(--ink-muted)",
              }}>
              + 新しいテキストを登録
            </button>
          </div>

          {/* 新規テキスト入力 */}
          {selectedTbId === "new" && (
            <div style={{ padding: "12px", borderRadius: 10, background: "var(--lavender-light)", border: "1px solid var(--lavender-border)", display: "flex", flexDirection: "column", gap: 8 }}>
              <input type="text" placeholder="テキスト名を入力" value={newTbName} onChange={e => setNewTbName(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
                  border: "1.5px solid var(--lavender-border)", background: "white", color: "var(--ink)", fontSize: 13, outline: "none" }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--lavender)" }}>そのテキストの総ページ数を登録</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="number" placeholder="例: 300" value={newTbPages} onChange={e => {
                  setNewTbPages(e.target.value);
                  const n = parseInt(e.target.value) || 0;
                  if (n > 0) { setPageFrom(1); setPageTo(n); }
                }} style={{ flex: 1, padding: "10px 12px", borderRadius: 8,
                  border: "1.5px solid var(--lavender-border)", background: "white", color: "var(--ink)", fontSize: 13, outline: "none" }} />
                <span style={{ fontSize: 12, color: "var(--lavender)" }}>ページ</span>
              </div>
            </div>
          )}

          {/* ページ範囲スライダー */}
          {totalPages > 0 && (
            <div style={{ padding: "14px", borderRadius: 10, background: "var(--bg-card)", border: "1.5px solid var(--line-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--sky)", fontFamily: "var(--font-en)" }}>
                  p.{pageFrom} 〜 p.{pageTo}
                </div>
                {sessionPct !== null && (
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--amber)", padding: "2px 10px", borderRadius: 20, background: "var(--amber-light)", border: "1px solid var(--amber-border)" }}>
                    {sessionPct}% <span style={{ fontSize: 10 }}>{sessionPages}p</span>
                  </div>
                )}
              </div>
              <DualRangeSlider min={1} max={totalPages} from={pageFrom} to={pageTo} onFromChange={setPageFrom} onToChange={setPageTo} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                <span style={{ fontSize: 9, color: "var(--ink-faint)" }}>p.1</span>
                <span style={{ fontSize: 9, color: "var(--ink-faint)" }}>p.{totalPages}</span>
              </div>
            </div>
          )}

          {/* メモ */}
          <textarea placeholder="メモ（任意）" value={memo} onChange={e => setMemo(e.target.value)} rows={4}
            style={{ width: "100%", padding: "12px", borderRadius: 10, boxSizing: "border-box",
              border: "1.5px solid var(--line-md)", background: "var(--bg-card)",
              color: "var(--ink)", fontSize: 13, lineHeight: 1.7, outline: "none", resize: "none" }} />
        </div>

        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "rgba(250,249,246,0.94)", backdropFilter: "blur(16px)",
          borderTop: "1px solid var(--line)", padding: "14px 16px 28px", zIndex: 50,
        }}>
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <button onClick={handleDone} className="btn-main" style={{ width: "100%" }}>
              記録する
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
