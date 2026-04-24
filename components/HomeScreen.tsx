"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { AppState, CustomTodo } from "@/lib/types";
import { getEffectiveSubjects } from "@/lib/examData";
import { getReviewAlerts } from "@/lib/forgettingCurve";
import {
  BookOpen, PenLine, CalendarDays,
  Settings, Clock, Flame, BookMarked,
} from "lucide-react";

interface Props {
  state: AppState;
  onNavigate: (page: "heatmap" | "record" | "natural" | "dashboard" | "mockexam" | "settings" | "forgetting" | "history") => void;
  onSaveTodos: (todos: CustomTodo[]) => void;
}

const getDaysUntil = (d: string) => {
  const t = new Date(d), n = new Date(); n.setHours(0,0,0,0);
  return Math.ceil((t.getTime() - n.getTime()) / 86400000);
};

/* ── Growing Tree ────────────────────────────────────────── */
const GrowingTree = ({ daysLeft, size = 44 }: { daysLeft: number; size?: number }) => {
  const stage = daysLeft > 180 ? 0 : daysLeft > 90 ? 1 : daysLeft > 45 ? 2 : daysLeft > 14 ? 3 : 4;
  const trunk  = "#92400E";
  const greens = ["#A8D4BC", "#84B898", "#6A9E7F", "#52836A", "#3D6B55"];
  const g      = greens[stage];
  const g2     = stage > 0 ? greens[stage - 1] : greens[0];
  const h      = Math.round(size * 56 / 44);
  return (
    <svg width={size} height={h} viewBox="0 0 44 56" fill="none">
      <ellipse cx="22" cy="53" rx="10" ry="2" fill={trunk} opacity="0.18" />
      {stage === 0 && (<><line x1="22" y1="52" x2="22" y2="44" stroke={g} strokeWidth="2" strokeLinecap="round" /><path d="M22 47 Q17 43 19 39 Q22 43 22 47" fill={g} /><path d="M22 47 Q27 43 25 39 Q22 43 22 47" fill={g2} opacity="0.8" /></>)}
      {stage === 1 && (<><rect x="20" y="42" width="4" height="11" rx="2" fill={trunk} opacity="0.8" /><ellipse cx="22" cy="37" rx="9" ry="10" fill={g} opacity="0.9" /><path d="M22 44 Q13 38 16 28 Q22 34 22 44" fill={g2} opacity="0.6" /><path d="M22 44 Q31 38 28 28 Q22 34 22 44" fill={g} opacity="0.7" /></>)}
      {stage === 2 && (<><rect x="19" y="38" width="6" height="15" rx="2.5" fill={trunk} opacity="0.85" /><ellipse cx="22" cy="30" rx="12" ry="13" fill={g} opacity="0.9" /><path d="M22 41 Q10 33 13 20 Q22 28 22 41" fill={g2} opacity="0.55" /><path d="M22 41 Q34 33 31 20 Q22 28 22 41" fill={g} opacity="0.6" /></>)}
      {stage === 3 && (<><rect x="18" y="34" width="8" height="19" rx="3" fill={trunk} opacity="0.85" /><ellipse cx="22" cy="22" rx="14" ry="16" fill={g} opacity="0.9" /><path d="M22 38 Q8 28 12 12 Q22 22 22 38" fill={g2} opacity="0.55" /><path d="M22 38 Q36 28 32 12 Q22 22 22 38" fill={g} opacity="0.6" /><ellipse cx="22" cy="15" rx="7" ry="6" fill={g2} opacity="0.5" /></>)}
      {stage === 4 && (<><rect x="17" y="30" width="10" height="23" rx="3.5" fill={trunk} opacity="0.85" /><ellipse cx="22" cy="17" rx="16" ry="18" fill={g} opacity="0.9" /><path d="M22 34 Q6 22 10 4 Q22 16 22 34" fill={g2} opacity="0.55" /><path d="M22 34 Q38 22 34 4 Q22 16 22 34" fill={g} opacity="0.6" /><ellipse cx="22" cy="9" rx="9" ry="8" fill={g2} opacity="0.55" /><ellipse cx="14" cy="16" rx="6" ry="5" fill={g} opacity="0.4" /><ellipse cx="30" cy="16" rx="6" ry="5" fill={g2} opacity="0.4" /></>)}
    </svg>
  );
};

/* ── Owl / UI asset components ───────────────────────────── */
// eslint-disable-next-line @next/next/no-img-element
const Img = ({ src, w, h, style }: { src: string; w: number; h: number; style?: React.CSSProperties }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" width={w} height={h} style={{ display: "block", objectFit: "contain", ...style }} />
);

const OwlStudying  = ({ size = 120 }: { size?: number }) => <Img src="/study-image.png" w={size} h={Math.round(size * 0.82)} />;
const OwlFocus     = ({ size = 54 }: { size?: number }) => <Img src="/owl-focus.png"     w={size} h={size} />;
const OwlCheering  = ({ size = 56 }: { size?: number }) => <Img src="/owl-cheering.png"  w={size} h={size} />;
const OwlThinking2 = ({ size = 52 }: { size?: number }) => <Img src="/owl-thinking2.png" w={size} h={size} />;
// 後方互換
const OwlPeeking   = ({ size = 48 }: { size?: number }) => <Img src="/owl-thinking2.png" w={size} h={size} />;

/* ── Section label ───────────────────────────────────────── */
const SL = ({ children, color }: { children: string; color: string }) => (
  <div className="sec-label" style={{ color }}>{children}</div>
);

/* ── 日替わり偉人名言 ────────────────────────────────────── */
const DAILY_QUOTES: { text: string; author: string }[] = [
  { text: "天才とは、1%のひらめきと99%の努力である。", author: "Thomas Edison" },
  { text: "成功とは、熱意を失わずに失敗し続けられることだ。", author: "Winston Churchill" },
  { text: "やってみせ、言って聞かせて、させてみて、ほめてやらねば人は動かじ。", author: "山本五十六" },
  { text: "夢なき者に理想なし、理想なき者に計画なし、計画なき者に実行なし。", author: "吉田松陰" },
  { text: "困難の中に、機会がある。", author: "Albert Einstein" },
  { text: "勝ちに不思議の勝ちあり、負けに不思議の負けなし。", author: "野村克也" },
  { text: "知識への投資が、最大の利益をもたらす。", author: "Benjamin Franklin" },
  { text: "道は開ける。行動する者にとってのみ。", author: "Dale Carnegie" },
  { text: "諦めた瞬間、試合終了ですよ。", author: "安西光義" },
  { text: "千里の道も、一歩から始まる。", author: "老子" },
  { text: "わからないことは恥ではない。学ぼうとしないことが恥だ。", author: "ソクラテス" },
  { text: "成功の秘訣は、始めることにある。", author: "Mark Twain" },
  { text: "集中力とは、本質的でないものをすべて断ることだ。", author: "Steve Jobs" },
  { text: "準備が整うのを待っていたら、いつまでも始められない。", author: "Lemony Snicket" },
  { text: "学ぶことをやめた者は、老いている。学び続ける者は、常に若い。", author: "Henry Ford" },
  { text: "石の上にも三年。", author: "日本のことわざ" },
  { text: "努力する人は希望を語り、怠ける人は不満を語る。", author: "井上靖" },
  { text: "最大の危機は、目標が高すぎて達成できないことではなく、目標が低すぎて達成してしまうことだ。", author: "Michelangelo" },
  { text: "人は負けると知りて戦うこともある。それこそが人間の誇りではないか。", author: "ガンダーラ" },
  { text: "自分を信じること。それが成功の第一歩だ。", author: "Ralph Waldo Emerson" },
  { text: "今日という日は、残りの人生の最初の日だ。", author: "Charles Dederich" },
  { text: "失敗は成功の母。", author: "Thomas Edison" },
  { text: "小さいことを積み重ねることが、とんでもないところへ行くただひとつの道だ。", author: "イチロー" },
  { text: "できると思えばできる、できないと思えばできない。どちらも正しい。", author: "Henry Ford" },
  { text: "人生は自転車に乗るようなもの。バランスを保つには走り続けなければならない。", author: "Albert Einstein" },
  { text: "成功する人は、諦めない人だ。失敗する人は、諦めた人だ。", author: "H. Ross Perot" },
  { text: "あなたの時間は限られている。他人の人生を生きることで無駄にするな。", author: "Steve Jobs" },
  { text: "昨日から学び、今日を生き、明日に希望を持て。", author: "Albert Einstein" },
  { text: "苦しいから逃げるのではない。逃げるから苦しくなるのだ。", author: "坂村真民" },
  { text: "人間は努力する限り、迷うものだ。", author: "Goethe" },
];

const getDailyQuote = (): { text: string; author: string } => {
  const day = Math.floor(Date.now() / 86400000);
  return DAILY_QUOTES[day % DAILY_QUOTES.length];
};

/* ── フクロウの日替わりひとこと ─────────────────────────── */
const OWL_COMMENTS: string[] = [
  "今日も一日、頑張ろう！",
  "コツコツが、合格への一番の近道だよ。",
  "昨日より少しだけ賢くなれたら、それで十分！",
  "迷ったら、まず手を動かしてみて。",
  "休憩も勉強のうち。無理しすぎないでね。",
  "一問一問、丁寧にいこう。",
  "今日の積み重ねが、本番の自信になるよ。",
  "わからなくて当然。わかるまでやるのが勉強！",
  "ファイト！ぼくも応援してるよ。",
  "問題を間違えるたびに、強くなってるんだよ。",
  "今日もここに来てくれてありがとう。",
  "小さな進歩を、ちゃんと喜んでね。",
  "合格した自分を、ちょっとだけ想像してみて。",
  "やる気が出ない日でも、開くだけで十分！",
  "継続は力なり。まじでそれだけ。",
  "今日の自分、昨日よりえらい。",
  "難しい問題ほど、解けたときが気持ちいいよ！",
  "焦らなくていい。着実に前進してるから。",
  "今日も一緒に頑張ろう！",
  "できないことより、できることを増やしていこう。",
  "本番まであと少し。ここが踏ん張りどころ！",
  "今日の努力は、絶対に裏切らないよ。",
  "苦手分野こそ、得点源に変えるチャンス！",
  "ノートに書き出すだけでも、頭が整理されるよ。",
  "完璧じゃなくていい。前に進んでいれば十分。",
  "今日も来た、それだけで花まるだよ！",
  "ぼくはいつもここで待ってるよ。一緒にやろう！",
  "睡眠もしっかりとってね。脳が定着させてくれるから。",
  "諦めなければ、必ず道は開ける。",
  "今日の自分を、未来の自分がきっと感謝するよ。",
];

const getDailyOwlComment = (): string => {
  const day = Math.floor(Date.now() / 86400000);
  return OWL_COMMENTS[day % OWL_COMMENTS.length];
};

/* ── ランクバッジ（絵文字なし・バーインジケーター） ──────── */
const RankBadge = ({ tier, color }: { tier: number; color: string }) => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 22 }}>
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} style={{
        width: 4,
        height: `${20 + i * 11}%`,
        minHeight: 3,
        borderRadius: 2,
        background: i < tier ? color : "var(--bg-elevated)",
        transition: "background 0.4s",
      }} />
    ))}
  </div>
);

/* ── ランクテーブル ──────────────────────────────────────── */
const RANKS = [
  { min: 0,    label: "たまご",               color: "#94A3B8", tier: 1, img: "/evo-1.png" },
  { min: 5,    label: "ひび割れたまご",       color: "#84B898", tier: 2, img: "/evo-2.png" },
  { min: 20,   label: "ベイビーふくろう",     color: "#6A9E7F", tier: 3, img: "/evo-3.png" },
  { min: 50,   label: "学生ふくろう",         color: "#4A8FA8", tier: 4, img: "/evo-4.png" },
  { min: 100,  label: "モラトリアムふくろう", color: "#C49A2B", tier: 5, img: "/evo-5.png" },
  { min: 200,  label: "大人ふくろう",         color: "#BC6C4F", tier: 6, img: "/evo-6.png" },
  { min: 500,  label: "中年ふくろう",         color: "#7C6FA0", tier: 7, img: "/evo-7.png" },
  { min: 2000, label: "賢者ふくろう",         color: "#92400E", tier: 8, img: "/evo-8.png" },
];

const getRank = (h: number) => {
  for (let i = RANKS.length - 1; i >= 0; i--)
    if (h >= RANKS[i].min) return { ...RANKS[i], next: RANKS[i + 1]?.min ?? null };
  return { ...RANKS[0], next: RANKS[1].min };
};

const calcStreak = (records: { date: string }[]): number => {
  if (!records.length) return 0;
  const today = new Date(); today.setHours(0,0,0,0);
  const dates = new Set(records.map(r => {
    const d = new Date(r.date); d.setHours(0,0,0,0); return d.getTime();
  }));
  // 今日か昨日から連続カウント
  let anchor = dates.has(today.getTime()) ? today.getTime()
    : dates.has(today.getTime() - 86400000) ? today.getTime() - 86400000
    : null;
  if (!anchor) return 0;
  let streak = 1, check = anchor - 86400000;
  while (dates.has(check)) { streak++; check -= 86400000; }
  return streak;
};

/* ══════════════════════════════════════════════════════════ */

export default function HomeScreen({ state, onNavigate, onSaveTodos }: Props) {
  const { examConfig } = state;
  if (!examConfig) return null;

  const subjects  = getEffectiveSubjects(examConfig.type, state);
  const daysLeft  = getDaysUntil(examConfig.examDate);
  // 忘却曲線でリコメンド（実際の記録あり・7日以上・最大2件）
  // 該当なしならランダム1件フォールバック（記録数が変わるまで固定）
  const reviewAlerts = useMemo(() => {
    const alerts = getReviewAlerts(subjects, state)
      .filter(a => state.studyRecords.some(r => r.topicId === a.topicId));
    if (alerts.length > 0) return alerts.slice(0, 2);
    const studied = subjects.flatMap(s =>
      s.topics
        .filter(t => state.studyRecords.some(r => r.topicId === t.id))
        .map(t => ({ topicId: t.id, topicName: t.name, subjectName: s.name, daysSince: 0, retention: 100, urgency: "warning" as const, reason: "" }))
    );
    if (studied.length === 0) return [];
    return [studied[Math.floor(Math.random() * studied.length)]];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.studyRecords.length]);
  const daysColor   = daysLeft <= 30 ? "#BC6C4F" : daysLeft <= 90 ? "#C49A2B" : "#334155";
  const totalHours  = Math.round(state.studyRecords.reduce((s, r) => s + (r.hours ?? 0), 0) * 10) / 10;
  const todayStr    = new Date().toDateString();
  const todayHours  = Math.round(state.studyRecords.filter(r => new Date(r.date).toDateString() === todayStr).reduce((s, r) => s + (r.hours ?? 0), 0) * 10) / 10;
  const streak      = calcStreak(state.studyRecords);
  const rank        = getRank(totalHours);
  const rankPct     = rank.next ? Math.min(100, Math.round(((totalHours - rank.min) / (rank.next - rank.min)) * 100)) : 100;
  const studiedTopicCount = subjects.flatMap(s => s.topics).filter(t => state.studyRecords.some(r => r.topicId === t.id)).length;
  const totalSessions = state.studyRecords.length;

  // ── 昨日のメモ ──────────────────────────────────────────
  const yesterdayMemos = (() => {
    const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(0,0,0,0);
    const yEnd = new Date(y); yEnd.setHours(23,59,59,999);
    return state.studyRecords.filter(r => {
      const t = new Date(r.date).getTime();
      return t >= y.getTime() && t <= yEnd.getTime() && (r.memo || r.rangeNote);
    });
  })();

  // ── フクロウアニメーション ──────────────────────────────
  const wrapperControls = useAnimation();
  const owlControls     = useAnimation();
  const [feeding,    setFeeding]    = useState(false);
  const [levelUp,    setLevelUp]    = useState(false);
  const [xpFloat,    setXpFloat]    = useState<string | null>(null);
  const [facingLeft, setFacingLeft] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleMsg,  setBubbleMsg]  = useState("");
  const bubblePoolRef = useRef<string[]>([]);
  const prevCount    = useRef(state.studyRecords.length);
  const prevRankTier = useRef(rank.tier);
  const wanderActive = useRef(false);
  const currentX     = useRef(0);

  const wanderDir      = useRef<1 | -1>(1); // 1=右, -1=左
  const wanderAreaRef  = useRef<HTMLDivElement>(null);

  const startWander = () => {
    wanderActive.current = true;
    const STEP     = 32;
    const JUMP     = 7;
    const HOP_DUR  = 0.28;
    const WAIT     = 350;
    const MAX_X    = 160; // モバイル対応で260→160

    const step = async () => {
      if (!wanderActive.current) return;

      const prevX = currentX.current;
      let nextX   = prevX + STEP * wanderDir.current;

      // 端に達したら折り返し
      if (nextX >= MAX_X) { nextX = MAX_X; wanderDir.current = -1; }
      else if (nextX <= 0) { nextX = 0;    wanderDir.current =  1; }

      setFacingLeft(wanderDir.current === -1);
      currentX.current = nextX;

      // x・y を同じ times で同期させて放物線軌道
      const N      = 20;
      const times  = Array.from({ length: N }, (_, i) => i / (N - 1));
      const xFrames = times.map(t => prevX + (nextX - prevX) * t);
      const yFrames = times.map(t => -JUMP * 4 * t * (1 - t));

      await wrapperControls.start({
        x: xFrames,
        y: yFrames,
        transition: { duration: HOP_DUR, ease: "linear", times },
      });

      // 着地スクワッシュ
      owlControls.start({
        scaleY: [1, 0.80, 1.10, 1],
        scaleX: [1, 1.14, 0.94, 1],
        transition: { duration: 0.22, times: [0, 0.28, 0.65, 1] },
      });

      // たまにランダムで立ち止まる（約40%の確率で2〜6秒停止）
      const pause = Math.random() < 0.4 ? WAIT + 2000 + Math.random() * 4000 : WAIT;
      await new Promise<void>(r => setTimeout(r, pause));
      step();
    };
    step();
  };

  const stopWander = () => { wanderActive.current = false; };

  useEffect(() => { startWander(); return stopWander; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 吹き出し（間欠：6〜10秒おきにランダムメッセージ表示、重複防止）
  const bubbleActiveRef = useRef(false);
  useEffect(() => {
    const fire = () => {
      if (bubbleActiveRef.current) return;
      const pool = bubblePoolRef.current;
      if (pool.length > 0) setBubbleMsg(pool[Math.floor(Math.random() * pool.length)]);
      bubbleActiveRef.current = true;
      setShowBubble(true);
      setTimeout(() => { setShowBubble(false); bubbleActiveRef.current = false; }, 3800);
    };
    const id = setInterval(fire, 6000 + Math.random() * 4000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ランクアップ検知
  useEffect(() => {
    if (rank.tier > prevRankTier.current) {
      prevRankTier.current = rank.tier;
      setLevelUp(true);
      stopWander();
      wrapperControls.stop();
      owlControls.start({
        rotate: [0, -20, 20, -15, 15, -8, 8, -3, 0],
        scale:  [1, 1.5, 0.8, 1.35, 0.9, 1.2, 0.95, 1.05, 1],
        y:      [0, -45, 8, -28, 5, -14, 2, -6, 0],
        transition: { duration: 1.6, ease: "easeInOut" },
      }).then(() => {
        startWander();
        setTimeout(() => setLevelUp(false), 3800);
      });
    }
  }, [rank.tier]); // eslint-disable-line react-hooks/exhaustive-deps

  // 学習記録 → 給餌アニメーション + XP表示
  useEffect(() => {
    if (state.studyRecords.length > prevCount.current) {
      const latest = state.studyRecords[0];
      prevCount.current = state.studyRecords.length;
      if (latest?.hours) setXpFloat(`+${latest.hours}h`);
      setFeeding(true);
      stopWander();
      wrapperControls.stop();
      owlControls.start({
        scale:  [1, 0.9, 1.5, 0.85, 1.25, 0.95, 1.08, 1],
        y:      [0, 4, -38, 8, -20, 3, -8, 0],
        rotate: [0, -5, -15, 12, -8, 5, -3, 0],
        transition: { duration: 1.1, times: [0, 0.1, 0.28, 0.45, 0.62, 0.78, 0.9, 1], ease: "easeInOut" },
      }).then(() => {
        startWander();
        setTimeout(() => { setFeeding(false); setXpFloat(null); }, 2000);
      });
    }
  }, [state.studyRecords.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // きもち（幸福度）計算
  const recentHours   = state.studyRecords
    .filter(r => Date.now() - new Date(r.date).getTime() < 7 * 86400000)
    .reduce((s, r) => s + (r.hours ?? 0), 0);
  const happinessPct  = Math.min(100, Math.round(recentHours / 14 * 100));
  const happinessInfo = happinessPct >= 70
    ? { label: "ごきげん！", color: "var(--sage)" }
    : happinessPct >= 35
    ? { label: "ふつう",     color: "var(--amber)" }
    : recentHours > 0
    ? { label: "さびしそう…", color: "var(--terra)" }
    : { label: "眠っている…", color: "var(--ink-faint)" };

  // 空腹度計算：今日の学習時間ベース（毎日リセット）
  // 0h=0%  3h=50%  6h=100%（上限）
  const fullnessPct = Math.min(100, Math.round((todayHours / 6) * 100));
  const hungerLevel = fullnessPct >= 80 ? "full"
    : fullnessPct >= 50 ? "peckish"
    : fullnessPct >= 20 ? "hungry"
    : "starving";

  // 一番長くご飯を食べていない科目
  const subjectHunger = subjects.map(s => {
    const recs = state.studyRecords.filter(r => r.subjectId === s.id);
    const last  = recs.length > 0 ? Math.max(...recs.map(r => new Date(r.date).getTime())) : 0;
    return { name: s.shortName ?? s.name, last };
  }).sort((a, b) => a.last - b.last);
  const wantedSubject = subjectHunger[0]?.name ?? "なにか";

  const hungerBubble = hungerLevel === "starving"
    ? `おなかぺこぺこ！！${wantedSubject}を早く食べさせて〜！！`
    : hungerLevel === "hungry"
    ? `おなかすいたよ〜！${wantedSubject}が食べたい！`
    : hungerLevel === "peckish"
    ? `そろそろおなかすいてきたよ〜　${wantedSubject}が食べたいな`
    : null;

  const neglectedSubjects = subjects
    .map(s => {
      const recs = state.studyRecords.filter(r => r.subjectId === s.id);
      const last = recs.length > 0 ? Math.max(...recs.map(r => new Date(r.date).getTime())) : 0;
      const daysSince = last > 0 ? Math.floor((Date.now() - last) / 86400000) : 999;
      return { name: s.shortName ?? s.name, daysSince };
    })
    .filter(s => s.daysSince >= 3)
    .sort((a, b) => b.daysSince - a.daysSince);

  // 空腹度が高い（hungry/starving）ときは空腹メッセ中心、満腹のときは激励・学習促進メッセ
  const bubblePool: string[] = (hungerLevel === "starving" || hungerLevel === "hungry")
    ? [
        hungerBubble!,
        hungerBubble!,
        `${wantedSubject}、早く食べたい〜！`,
        ...neglectedSubjects.slice(0, 1).map(s => `${s.name}、最近ふれてないよ〜！`),
      ]
    : [
        ...(hungerBubble ? [hungerBubble] : []),
        ...neglectedSubjects.slice(0, 2).map(s => `${s.name}、最近ふれてないよ〜！`),
        "今日もいっしょにがんばろ！",
        "ちょっとだけでも勉強しよ〜！",
      ];
  bubblePoolRef.current = bubblePool;

  // ランクtierからフクロウサイズを算出（tier1=120px → tier8=190px）
  const owlSize = 140 + rank.tier * 10;

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
          <button onClick={() => onNavigate("settings")} className="btn-sub" style={{ padding: "6px 10px", display: "flex", alignItems: "center" }}>
            <Settings size={13} strokeWidth={1.6} color="var(--ink-muted)" />
          </button>
        </div>
      </div>

      {/* ── BENTO GRID ── */}
      <div style={{ padding: "0 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* TODAY — 全幅・アイボリー */}
        <div className="sticky" style={{ ...card({ gridColumn: "span 2", padding: "12px 14px 12px" }), position: "relative" }}>

          {/* ヘッダー：タイトル + 今日/累計時間 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <CalendarDays size={14} strokeWidth={1.4} color="var(--amber)" />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#1E293B", letterSpacing: "0.01em" }}>今日のタスク</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: "var(--ink-muted)", marginBottom: 1 }}>今日</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--sage)", fontFamily: "var(--font-en)", lineHeight: 1 }}>
                  {todayHours}<span style={{ fontSize: 10, fontWeight: 500, color: "var(--ink-muted)", marginLeft: 1 }}>h</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: "var(--ink-muted)", marginBottom: 1 }}>累計</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--sky)", fontFamily: "var(--font-en)", lineHeight: 1 }}>
                  {totalHours}<span style={{ fontSize: 10, fontWeight: 500, color: "var(--ink-muted)", marginLeft: 1 }}>h</span>
                </div>
              </div>
            </div>
          </div>

          {/* フクロウ（左）＋ 吹き出し ＋ 本番まで日数 + 木（右） */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, minWidth: 0 }}>
            {/* フクロウ（固定） */}
            <img src="/desk-study.png" alt="" style={{ width: 88, height: 88, objectFit: "contain", flexShrink: 0 }} />
            {/* 吹き出し（残りスペースを使う） */}
            <div style={{ position: "relative", flex: 1, minWidth: 0, marginBottom: 6 }}>
              <div style={{
                background: "#FFFEF7",
                border: "1.5px solid var(--line-md)",
                borderRadius: 10,
                padding: "6px 10px",
                fontSize: 11,
                color: "var(--ink)",
                lineHeight: 1.55,
                boxShadow: "1px 2px 5px rgba(51,65,85,0.07)",
              }}>
                {getDailyOwlComment()}
              </div>
              {/* しっぽ（左向き） */}
              <div style={{ position: "absolute", left: -8, bottom: 10, width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderRight: "9px solid var(--line-md)" }} />
              <div style={{ position: "absolute", left: -6, bottom: 11, width: 0, height: 0, borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderRight: "7px solid #FFFEF7" }} />
            </div>
            {/* 本番まで日数 + 木（固定） */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <GrowingTree daysLeft={daysLeft} size={46} />
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--ink-muted)" }}>本番まで</div>
                <div style={{ display: "inline-flex", alignItems: "baseline" }}>
                  <span style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.04em", color: daysColor, fontFamily: "var(--font-en)" }}>
                    {Math.max(0, daysLeft)}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-muted)", marginLeft: 2 }}>日</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 昨日の復習メモ ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-muted)", letterSpacing: "0.08em" }}>昨日のメモ（復習用）</div>
            {yesterdayMemos.length === 0 ? (
              <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--bg-elevated)", fontSize: 12, color: "var(--ink-faint)", textAlign: "center" }}>
                昨日のメモはありません
              </div>
            ) : (
              yesterdayMemos.map((r, i) => {
                const subjectName = subjects.find(s => s.id === r.subjectId)?.shortName ?? "";
                const topicName   = subjects.flatMap(s => s.topics).find(t => t.id === r.topicId)?.name ?? "";
                return (
                  <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: "var(--bg-elevated)", borderLeft: "3px solid var(--sky)" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5, flexWrap: "wrap" }}>
                      {subjectName && <span style={{ fontSize: 9, fontWeight: 700, color: "var(--sky)", background: "var(--sky-light)", border: "1px solid var(--sky-border)", borderRadius: 4, padding: "2px 6px" }}>{subjectName}</span>}
                      {topicName   && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)" }}>{topicName}</span>}
                    </div>
                    {r.rangeNote && <div style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: r.memo ? 4 : 0 }}>範囲: {r.rangeNote}</div>}
                    {r.memo      && <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.6 }}>{r.memo}</div>}
                  </div>
                );
              })
            )}
          </div>

          {/* ── 名言：カード下部にタータンで組み込み ── */}
          {(() => {
            const q = getDailyQuote();
            return (
              <div style={{
                position: "relative",
                margin: "14px -14px -12px",
                borderRadius: "0 0 6px 6px",
                overflow: "visible",
                backgroundColor: "#EED9B8",
                backgroundImage: [
                  "repeating-linear-gradient(0deg, transparent 0px, transparent 9px, rgba(130,145,160,0.22) 9px, rgba(130,145,160,0.22) 11px)",
                  "repeating-linear-gradient(90deg, transparent 0px, transparent 9px, rgba(130,145,160,0.22) 9px, rgba(130,145,160,0.22) 11px)",
                  "repeating-linear-gradient(0deg, transparent 0px, transparent 20px, rgba(155,110,70,0.18) 20px, rgba(155,110,70,0.18) 24px)",
                  "repeating-linear-gradient(90deg, transparent 0px, transparent 20px, rgba(155,110,70,0.18) 20px, rgba(155,110,70,0.18) 24px)",
                ].join(", "),
                borderTop: "2px dashed rgba(100,60,30,0.28)",
                padding: "10px 16px 12px",
              }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 7, paddingRight: 76 }}>
                  <span style={{
                    fontSize: 26, lineHeight: 1, flexShrink: 0,
                    color: "#8B5835", fontFamily: "Georgia, serif", fontWeight: 900,
                    marginTop: 1,
                  }}>"</span>
                  <div>
                    <div style={{
                      fontSize: 14, lineHeight: 1.75,
                      color: "#4A3020",
                      fontFamily: "var(--font-ja), sans-serif",
                      fontWeight: 500, letterSpacing: "0.02em",
                    }}>
                      {q.text}
                    </div>
                    <div style={{
                      marginTop: 5, fontSize: 11, fontWeight: 700,
                      color: "#8B6045", letterSpacing: "0.11em",
                      textTransform: "uppercase" as const,
                    }}>
                      — {q.author}
                    </div>
                  </div>
                </div>
                <img src="/owl-proud.png" alt="" style={{ position: "absolute", right: 0, bottom: 0, width: 70, objectFit: "contain", objectPosition: "bottom" }} />
              </div>
            );
          })()}


        </div>


        {/* GAMIFICATION — 育成カード */}
        <div className="sticky" style={{ ...card({ gridColumn: "span 2", padding: "0" }), overflow: "visible", position: "relative" }}>

          {/* ── RANK UP オーバーレイ ── */}
          <AnimatePresence>
            {levelUp && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: "absolute", inset: 0, zIndex: 20, borderRadius: "inherit", pointerEvents: "none", overflow: "hidden" }}
              >
                {/* 背景フラッシュ */}
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: [0, 0.5, 0.2, 0.4, 0] }}
                  transition={{ duration: 1.2 }}
                  style={{ position: "absolute", inset: 0, background: rank.color }}
                />
                {/* スター粒子 */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 1, x: "50%", y: "50%", scale: 0 }}
                    animate={{ opacity: 0, x: `${50 + (Math.cos(i / 12 * Math.PI * 2) * 80)}%`, y: `${50 + (Math.sin(i / 12 * Math.PI * 2) * 80)}%`, scale: [0, 1.5, 0] }}
                    transition={{ duration: 1.4, delay: i * 0.04, ease: "easeOut" }}
                    style={{ position: "absolute", width: 8, height: 8, borderRadius: "50%", background: ["#FBBF24","#34D399","#60A5FA","#F472B6","#A78BFA"][i % 5] }}
                  />
                ))}
                {/* RANK UP テキスト */}
                <motion.div
                  initial={{ scale: 0, rotate: -12, opacity: 0 }}
                  animate={{ scale: [0, 1.4, 1], rotate: [-12, 6, 0], opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.7, delay: 0.3, type: "spring", stiffness: 260, damping: 16 }}
                  style={{ position: "absolute", top: "30%", left: 0, right: 0, textAlign: "center" }}
                >
                  <div style={{ fontSize: 26, fontWeight: 900, color: rank.color, textShadow: `0 0 20px ${rank.color}88, 0 2px 0 rgba(0,0,0,0.15)`, letterSpacing: "0.05em" }}>
                    RANK UP！
                  </div>
                  <motion.div
                    animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.2, repeat: Infinity }}
                    style={{ fontSize: 14, fontWeight: 700, color: rank.color, marginTop: 4 }}
                  >
                    {rank.label} に進化！
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ padding: "14px 20px 18px" }}>

            {/* ランク名（中央・1行） */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "var(--ink-muted)", marginBottom: 2 }}>
                  RANK {rank.tier}
                </div>
                <motion.div
                  key={rank.tier}
                  initial={{ scale: 0.75, opacity: 0, y: 5 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  style={{ fontSize: 20, fontWeight: 900, color: rank.color, lineHeight: 1, whiteSpace: "nowrap" }}
                >
                  {rank.label}
                </motion.div>
              </div>
              <RankBadge tier={rank.tier} color={rank.color} />
            </div>

            {/* フクロウ歩行エリア（全幅・固定高さ・下限固定） */}
            <div ref={wanderAreaRef} style={{ position: "relative", height: owlSize + 36, marginBottom: 6 }}>

              {/* 背景 */}
              <div style={{
                position: "absolute", inset: 0, borderRadius: 10, overflow: "hidden", zIndex: 0,
                backgroundImage: "url('/bg-grass.png')",
                backgroundSize: "100% 100%",
                backgroundRepeat: "no-repeat",
              }}>
              </div>

              {/* フクロウ（最前面・overflow:hiddenの外なのでジャンプ自由） */}
              <motion.div animate={wrapperControls} style={{ position: "absolute", bottom: 0, left: 0, width: owlSize, zIndex: 2 }}>

                {/* 吹き出し */}
                <AnimatePresence mode="wait">
                  {showBubble && bubbleMsg && (
                    <motion.div
                      key="bubble"
                      initial={{ opacity: 0, x: -6, scale: 0.92 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -4, scale: 0.94 }}
                      transition={{ type: "spring", stiffness: 340, damping: 24 }}
                      style={{
                        position: "absolute",
                        left: "calc(80% - 4px)",
                        top: "28%",
                        zIndex: 30,
                        pointerEvents: "none",
                      }}
                    >
                      <div style={{ position: "absolute", left: -8, top: 10, width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderRight: "8px solid rgba(100,160,220,0.45)" }} />
                      <div style={{ position: "absolute", left: -6, top: 11, width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderRight: "7px solid #EBF5FF" }} />
                      <div style={{
                        background: "#EBF5FF",
                        border: "1.5px solid rgba(100,160,220,0.45)",
                        borderRadius: 20,
                        padding: "9px 13px",
                        fontSize: 11, fontWeight: 600,
                        color: "#1E3A5F", lineHeight: 1.6,
                        width: 130,
                        boxShadow: "0 2px 8px rgba(100,150,210,0.15)",
                      }}>
                        {bubbleMsg}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div style={{ transform: (facingLeft !== (rank.tier === 4 || rank.tier === 7)) ? "scaleX(-1)" : "none" }}>
                  <motion.img
                    src={rank.img} alt={rank.label} animate={owlControls}
                    style={{ width: owlSize, objectFit: "contain", objectPosition: "bottom", display: "block" }}
                  />
                </div>
                {/* XP フロートテキスト */}
                <AnimatePresence>
                  {xpFloat && (
                    <motion.div key={xpFloat}
                      initial={{ y: 0, opacity: 1, scale: 0.8 }}
                      animate={{ y: -70, opacity: 0, scale: 1.15 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.8, ease: "easeOut" }}
                      style={{ position: "absolute", top: "5%", left: "50%", transform: "translateX(-50%)", fontSize: 15, fontWeight: 900, color: "var(--sage)", whiteSpace: "nowrap", textShadow: "0 0 10px rgba(80,160,80,0.5)", pointerEvents: "none" }}
                    >
                      ✨ {xpFloat} EXP
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* 給餌パーティクル */}
                <AnimatePresence>
                  {feeding && Array.from({ length: 8 }).map((_, i) => {
                    const angle = (i / 8) * Math.PI * 2;
                    return (
                      <motion.div key={i}
                        initial={{ opacity: 1, scale: 0.4, x: 0, y: 0 }}
                        animate={{ opacity: 0, scale: 1.2, x: Math.cos(angle) * 48, y: Math.sin(angle) * 48 - 24 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, delay: i * 0.04, ease: "easeOut" }}
                        style={{ position: "absolute", top: "35%", left: "50%", width: 10, height: 10, borderRadius: "50%", background: ["#FBBF24","#34D399","var(--sky)","#F472B6","#A78BFA","var(--terra)","#60A5FA","#FCA5A5"][i], pointerEvents: "none" }}
                      />
                    );
                  })}
                </AnimatePresence>

              </motion.div>
            </div>

            {/* EXP バー（全幅） */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "var(--ink-muted)", marginBottom: 5 }}>
                <span style={{ fontWeight: 700, letterSpacing: "0.1em" }}>EXP</span>
                {rank.next
                  ? <span style={{ fontFamily: "var(--font-en)", fontWeight: 600 }}>{totalHours} / {rank.next}h</span>
                  : <span style={{ fontWeight: 700, color: rank.color }}>MAX RANK</span>
                }
              </div>
              <div style={{ height: 12, borderRadius: 6, background: "var(--bg-elevated)", position: "relative", overflow: "visible" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rankPct}%` }}
                  transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{ height: "100%", borderRadius: 6, background: `linear-gradient(90deg, ${rank.color}70, ${rank.color})`, position: "relative", overflow: "visible" }}
                >
                  {rankPct > 3 && (
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.6, 1], boxShadow: [`0 0 4px ${rank.color}`, `0 0 16px ${rank.color}`, `0 0 4px ${rank.color}`] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{ position: "absolute", right: -7, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, borderRadius: "50%", background: rank.color, border: "2.5px solid white" }}
                    />
                  )}
                </motion.div>
              </div>
              <div style={{ marginTop: 4, fontSize: 9, color: rank.color, textAlign: "right", fontWeight: 700 }}>
                {rank.next
                  ? `進化まで ${Math.max(0, Math.round((rank.next - totalHours) * 10) / 10)}h`
                  : "🎉 最強ランク達成！"
                }
              </div>
            </div>

            {/* おなかバー */}
            <div style={{ background: "var(--bg-elevated)", borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "var(--ink-muted)", marginBottom: 6 }}>🍖 勉強時間がフクロウの餌になるよ！</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 10, color: "var(--ink-muted)", flexShrink: 0 }}>空腹度</span>
                <div style={{ flex: 1, height: 7, borderRadius: 4, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${fullnessPct}%` }}
                    transition={{ duration: 1.3, ease: "easeOut" }}
                    style={{ height: "100%", borderRadius: 4, background: fullnessPct >= 60 ? "var(--sage)" : fullnessPct >= 30 ? "var(--amber)" : "var(--terra)" }}
                  />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, flexShrink: 0, color: fullnessPct >= 60 ? "var(--sage)" : fullnessPct >= 30 ? "var(--amber)" : "var(--terra)" }}>
                  {fullnessPct}%
                </span>
              </div>
            </div>

            {/* 3ステータス */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
              {([
                { Icon: Clock,      value: `${totalHours}`,       unit: "h",   label: "累計EXP",  color: "var(--sky)"     },
                { Icon: Flame,      value: `${streak}`,           unit: "日",  label: "連続記録", color: "var(--terra)"   },
                { Icon: BookMarked, value: `${studiedTopicCount}`,unit: "論点",label: "学習済み", color: "var(--lavender)"},
              ] as const).map((s, i) => (
                <div key={i} style={{ textAlign: "center", padding: "10px 4px", borderRight: i < 2 ? "1px solid var(--line)" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 5 }}>
                    <s.Icon size={14} strokeWidth={1.4} color={s.color} />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", lineHeight: 1, fontFamily: "var(--font-en)" }}>
                    {s.value}<span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-muted)", marginLeft: 2 }}>{s.unit}</span>
                  </div>
                  <div style={{ fontSize: 9, color: "var(--ink-muted)", marginTop: 3, fontWeight: 600, letterSpacing: "0.08em" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {totalSessions > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--ink-muted)", textAlign: "center" }}>
                これまでに <span style={{ fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-en)" }}>{totalSessions}</span> 回の学習を記録しました
              </div>
            )}
          </div>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={() => onNavigate("dashboard")} className="btn-sub" style={{ width: "100%", fontSize: 11 }}>
              進捗確認
            </button>
            <button onClick={() => onNavigate("history")} className="btn-sub" style={{ width: "100%", fontSize: 11 }}>
              学習ログ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
