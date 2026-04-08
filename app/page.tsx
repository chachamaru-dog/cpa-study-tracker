"use client";

import { useState, useEffect, useRef } from "react";
import { AppState } from "@/lib/types";
import { loadState, saveState, updateTopicProgress, defaultState } from "@/lib/storage";
import { getSubjects } from "@/lib/examData";
import { generateInitialProgress } from "@/lib/initialData";
import ExamSetup from "@/components/ExamSetup";
import OnboardingQuiz from "@/components/OnboardingQuiz";
import HomeScreen from "@/components/HomeScreen";
import Dashboard from "@/components/Dashboard";
import Heatmap from "@/components/Heatmap";
import RecordInput from "@/components/RecordInput";
import NaturalInput, { StudySession } from "@/components/NaturalInput";
import { StudyRecord } from "@/lib/types";
import MockExamInput from "@/components/MockExamInput";
import SettingsScreen from "@/components/SettingsScreen";

type Page =
  | "setup" | "onboarding" | "onboarding_preview" | "onboarding_redo"
  | "home" | "dashboard" | "heatmap" | "record" | "natural" | "mockexam" | "settings";

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [page, setPage] = useState<Page>("setup");
  const stateRef = useRef<AppState | null>(null);

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    stateRef.current = loaded;
    if (loaded.examConfig) setPage("home");
  }, []);

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
          handleSave({ ...stateRef.current!, examConfig: config });
          setPage("onboarding");
        }}
      />
    );
  }

  const subjects = getSubjects(state.examConfig.type);

  // ─── 初回オンボーディング ───
  if (page === "onboarding") {
    return (
      <OnboardingQuiz
        subjects={subjects}
        onComplete={(answers) => {
          handleSave({
            ...stateRef.current!,
            topicProgress: generateInitialProgress(subjects, answers),
            studyRecords: [],
          });
          setPage("home");
        }}
      />
    );
  }

  // ─── プレビューモード（データ保存なし） ───
  if (page === "onboarding_preview") {
    return (
      <OnboardingQuiz
        subjects={subjects}
        previewMode
        onComplete={() => setPage("settings")} // プレビューなので呼ばれないが念のため
        onClose={() => setPage("settings")}
      />
    );
  }

  // ─── やり直し（上書き保存） ───
  if (page === "onboarding_redo") {
    return (
      <OnboardingQuiz
        subjects={subjects}
        onComplete={(answers) => {
          handleSave({
            ...stateRef.current!,
            topicProgress: generateInitialProgress(subjects, answers),
          });
          setPage("home");
        }}
        onClose={() => setPage("settings")}
      />
    );
  }

  // ─── 設定 ───
  if (page === "settings") {
    return (
      <SettingsScreen
        onBack={() => setPage("home")}
        onPreviewOnboarding={() => setPage("onboarding_preview")}
        onRedoOnboarding={() => setPage("onboarding_redo")}
        onResetData={() => {
          if (window.confirm("すべてのデータを削除して最初からやり直しますか？\nこの操作は取り消せません。")) {
            handleSave({ ...defaultState });
            setPage("setup");
          }
        }}
      />
    );
  }

  if (page === "heatmap") return <Heatmap state={state} onBack={() => setPage("home")} />;

  if (page === "record") {
    return (
      <RecordInput
        state={state}
        onRecord={(topicId, result) => {
          handleSave(updateTopicProgress(stateRef.current!, topicId, result));
        }}
        onBack={() => setPage("home")}
      />
    );
  }

  if (page === "natural") {
    return (
      <NaturalInput
        state={state}
        onApply={(session: StudySession) => {
          const record: StudyRecord = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
            topicId: "",
            subjectId: session.subjectId,
            result: "neutral",
            method: session.method,
            hours: session.hours,
            concentration: session.concentration,
            date: new Date().toISOString(),
            memo: "",
          };
          handleSave({
            ...stateRef.current!,
            studyRecords: [record, ...stateRef.current!.studyRecords],
          });
        }}
        onBack={() => setPage("home")}
      />
    );
  }

  if (page === "mockexam") {
    return (
      <MockExamInput
        state={state}
        onSave={(newProgress) => {
          handleSave({ ...stateRef.current!, topicProgress: newProgress });
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
      />
    );
  }

  return <HomeScreen state={state} onNavigate={(p) => setPage(p as Page)} />;
}
