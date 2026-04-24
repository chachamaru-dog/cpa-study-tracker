"use client";

import { useState, useEffect, useRef } from "react";
import { AppState } from "@/lib/types";
import { loadState, saveState, updateTopicProgress, touchTopicProgress, defaultState } from "@/lib/storage";
import { getSubjects } from "@/lib/examData";
import { generateInitialProgress } from "@/lib/initialData";
import ExamSetup from "@/components/ExamSetup";
import HomeScreen from "@/components/HomeScreen";
import Dashboard from "@/components/Dashboard";
import Heatmap from "@/components/Heatmap";
import NaturalInput, { StudySession } from "@/components/NaturalInput";
import { StudyRecord } from "@/lib/types";
import MockExamInput from "@/components/MockExamInput";
import SettingsScreen from "@/components/SettingsScreen";
import HistoryScreen from "@/components/HistoryScreen";

type Page =
  | "setup" | "home" | "dashboard" | "heatmap" | "natural" | "mockexam" | "settings" | "history";

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [page, setPage] = useState<Page>("setup");
  const stateRef = useRef<AppState | null>(null);

  // リマインダーチェック（アプリ起動時・ページ復帰時）
  const checkReminders = (s: AppState) => {
    const due = (s.reminders ?? []).filter(r => new Date(r.scheduledAt) <= new Date());
    if (due.length === 0) return;
    if (!("Notification" in window)) return;
    const show = () => {
      due.forEach(r => {
        try {
          new Notification(`📚 復習リマインダー`, {
            body: `「${r.topicName}」を復習しましょう！`,
            icon: "/owl-em-happy.png",
          });
        } catch { /* ignore */ }
      });
      // 発火済みリマインダーを削除
      const next = { ...s, reminders: (s.reminders ?? []).filter(r => !due.find(d => d.id === r.id)) };
      stateRef.current = next;
      setState(next);
      saveState(next);
    };
    if (Notification.permission === "granted") {
      show();
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(p => { if (p === "granted") show(); });
    }
  };

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    stateRef.current = loaded;
    if (loaded.examConfig) {
      setPage("home");
      checkReminders(loaded);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = (newState: AppState) => {
    stateRef.current = newState;
    setState(newState);
    saveState(newState);
  };

  if (!state) return null;

  // ─── 試験選択 ───
  if (page === "setup" || !state.examConfig) {
    return (
      <ExamSetup
        onSave={(config) => {
          const subjects = getSubjects(config.type);
          handleSave({
            ...stateRef.current!,
            examConfig: config,
            topicProgress: generateInitialProgress(subjects),
            studyRecords: [],
          });
          setPage("home");
        }}
      />
    );
  }

  // ─── 設定 ───
  if (page === "settings") {
    return (
      <SettingsScreen
        examConfig={state.examConfig!}
        onBack={() => setPage("home")}
        onResetData={() => {
          if (window.confirm("すべてのデータを削除して最初からやり直しますか？\nこの操作は取り消せません。")) {
            handleSave({ ...defaultState });
            setPage("setup");
          }
        }}
        onUpdateExamConfig={(config) => {
          handleSave({ ...stateRef.current!, examConfig: config });
        }}
      />
    );
  }

  if (page === "heatmap")  return (
    <Heatmap
      state={state}
      onBack={() => setPage("home")}
      onSaveReminders={(reminders) => handleSave({ ...stateRef.current!, reminders })}
    />
  );
  if (page === "history")  return <HistoryScreen state={state} onBack={() => setPage("home")} />;

  if (page === "natural") {
    return (
      <NaturalInput
        state={state}
        onApply={(session: StudySession) => {
          // 新規テキストを登録してIDを確定
          let resolvedTextbookId = session.textbookId;
          let updatedTextbooks   = [...(stateRef.current!.textbooks ?? [])];
          if (session.newTextbook) {
            const newTb = {
              id: `tb_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              ...session.newTextbook,
            };
            updatedTextbooks = [...updatedTextbooks, newTb];
            resolvedTextbookId = newTb.id;
          }

          const record: StudyRecord = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
            topicId:      session.topicId,
            subjectId:    session.subjectId,
            result:       "neutral",
            method:       session.method,
            hours:        session.hours,
            understanding: session.understanding,
            isReview:     session.isReview,
            coveragePct:  session.coveragePct,
            rangeNote:    session.rangeNote,
            textbookId:   resolvedTextbookId,
            pageFrom:     session.pageFrom,
            pageTo:       session.pageTo,
            date:         new Date().toISOString(),
            memo:         session.memo,
          };
          let next: typeof stateRef.current = {
            ...stateRef.current!,
            textbooks:    updatedTextbooks,
            studyRecords: [record, ...stateRef.current!.studyRecords],
          };
          if (session.topicId) {
            next = touchTopicProgress(next!, session.topicId, session.understanding);
          }
          handleSave(next!);
        }}
        onBack={() => setPage("home")}
        onUpdateTextbooks={(textbooks) => {
          handleSave({ ...stateRef.current!, textbooks });
        }}
        onSaveTopicConfig={(overrides, customTopics) => {
          handleSave({ ...stateRef.current!, topicNameOverrides: overrides, customTopics });
        }}
      />
    );
  }

  if (page === "mockexam") {
    return (
      <MockExamInput
        state={state}
        onSave={(newProgress, mockRecord) => {
          handleSave({
            ...stateRef.current!,
            topicProgress: newProgress,
            mockExamRecords: [mockRecord, ...(stateRef.current!.mockExamRecords ?? [])],
          });
        }}
        onBack={() => setPage("home")}
      />
    );
  }

  if (page === "dashboard") {
    return (
      <Dashboard
        state={state}
        onNavigate={(p) => setPage(p as Page)}
        onBack={() => setPage("home")}
        onToggleConfident={(topicId, confident) => {
          const next = {
            ...stateRef.current!,
            topicProgress: {
              ...stateRef.current!.topicProgress,
              [topicId]: { ...stateRef.current!.topicProgress[topicId], selfConfident: confident },
            },
          };
          handleSave(next);
        }}
        onSaveReminders={(reminders) => handleSave({ ...stateRef.current!, reminders })}
      />
    );
  }

  return (
    <HomeScreen
      state={state}
      onNavigate={(p) => setPage(p as Page)}
      onSaveTodos={(todos) => handleSave({ ...stateRef.current!, customTodos: todos })}
    />
  );
}
