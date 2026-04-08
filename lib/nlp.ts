import { SUBJECTS_SHORT, SUBJECTS_ESSAY } from "./examData";
import { Subject } from "./types";

// 新しいtopicIDに対応したキーワード辞書
const TOPIC_KEYWORDS: Record<string, string[]> = {
  // 財務会計論
  fin_principles:    ["企業会計原則", "概念フレームワーク", "会計公準", "質的特性", "真実性の原則", "正規の簿記", "一般原則"],
  fin_revenue:       ["収益認識", "履行義務", "変動対価", "IFRS15", "売上認識", "収益"],
  fin_financial_ins: ["金融商品", "金融資産", "金融負債", "有価証券", "売掛金", "貸付金"],
  fin_tangible:      ["有形固定資産", "減価償却", "取得原価", "建物", "機械装置", "固定資産"],
  fin_intangible:    ["無形固定資産", "研究開発費", "特許権", "商標権", "ソフトウェア"],
  fin_lease:         ["リース", "使用権資産", "ファイナンスリース", "オペレーティングリース"],
  fin_retirement:    ["退職給付", "退職給付債務", "年金", "勤務費用", "数理計算"],
  fin_tax_effect:    ["税効果", "繰延税金", "一時差異", "永久差異", "DTA", "DTL"],
  fin_consolidation: ["連結", "のれん", "非支配株主", "子会社", "持分法", "連結財務諸表"],
  fin_merger:        ["企業結合", "事業分離", "合併", "取得", "パーチェス法"],
  fin_forex:         ["外貨換算", "外貨建", "為替", "換算差額"],
  fin_hedge:         ["ヘッジ", "デリバティブ", "先物", "オプション", "スワップ", "ヘッジ会計"],
  fin_impairment:    ["減損", "回収可能価額", "使用価値", "正味売却価額"],
  fin_provision:     ["引当金", "貸倒引当金", "賞与引当金", "負債会計"],
  fin_inventory:     ["棚卸資産", "棚卸", "在庫", "先入先出", "平均法", "低価法"],
  fin_equity:        ["純資産", "株主資本", "資本剰余金", "利益剰余金", "自己株式", "包括利益"],
  fin_cashflow:      ["キャッシュフロー", "CF計算書", "キャッシュ・フロー", "間接法", "直接法", "営業CF"],
  fin_segment:       ["セグメント", "事業セグメント", "セグメント情報"],
  fin_asset_retire:  ["資産除去債務", "除去費用"],

  // 管理会計論
  mgmt_theory:    ["原価計算基準", "管理会計理論", "原価計算制度", "原価計算の目的"],
  mgmt_cost_item: ["費目別原価計算", "材料費", "労務費", "経費", "製造間接費", "費目"],
  mgmt_individual:["個別原価計算", "製造指図書", "仕損じ", "作業くず", "個別"],
  mgmt_process:   ["総合原価計算", "工程別", "組別", "等級別", "連産品", "副産物", "月末仕掛品", "月初仕掛品"],
  mgmt_standard:  ["標準原価計算", "標準原価", "差異分析", "価格差異", "数量差異", "能率差異", "操業度差異"],
  mgmt_direct:    ["直接原価計算", "全部原価計算", "貢献利益", "固定費調整"],
  mgmt_abc:       ["ABC", "活動基準原価計算", "コストドライバー", "活動基準"],
  mgmt_cvp:       ["CVP", "損益分岐点", "安全余裕率", "営業レバレッジ", "目標利益", "短期利益計画"],
  mgmt_decision:  ["意思決定会計", "差額原価", "埋没原価", "機会原価", "特殊注文", "自製か購入か"],
  mgmt_investment:["設備投資", "NPV", "IRR", "正味現在価値", "回収期間法", "経済計算"],
  mgmt_budget:    ["予算管理", "マスターバジェット", "予算統制", "業績測定", "フレキシブル予算"],

  // 監査論
  audit_concept:  ["監査の目的", "財務諸表監査", "保証業務", "監査の基礎概念"],
  audit_risk:     ["監査リスク", "固有リスク", "統制リスク", "発見リスク", "重要性", "リスクアプローチ"],
  audit_internal: ["内部統制", "COSO", "統制環境", "統制活動", "モニタリング"],
  audit_plan:     ["監査計画", "監査手続", "監査調書", "監査基準委員会"],
  audit_evidence: ["監査証拠", "実証手続", "分析的手続", "確認", "棚卸立会"],
  audit_report:   ["監査報告", "監査意見", "無限定適正意見", "限定付", "不適正", "意見不表明", "強調事項"],
  audit_quality:  ["品質管理", "品質管理基準", "査閲", "モニタリング"],
  audit_ethics:   ["倫理規則", "独立性", "職業倫理", "守秘義務", "利益相反"],
  audit_it:       ["IT監査", "IT環境", "全般統制", "業務処理統制"],
  audit_group:    ["グループ監査", "初年度監査", "後発事象", "継続企業", "特殊領域"],

  // 企業法
  corp_establish: ["設立", "定款", "発起人", "発起設立", "募集設立"],
  corp_share:     ["株式", "新株予約権", "種類株式", "株式の譲渡", "単元株"],
  corp_meeting:   ["機関設計", "株主総会", "監査役", "委員会設置会社", "指名委員会"],
  corp_director:  ["取締役", "代表取締役", "取締役会", "善管注意義務", "忠実義務", "役員の責任"],
  corp_calc:      ["計算", "配当", "剰余金", "計算書類", "分配可能額"],
  corp_reorg:     ["組織再編", "合併", "会社分割", "株式交換", "株式移転", "事業譲渡"],
  corp_bond:      ["社債", "社債権者", "社債管理"],
  corp_finlaw:    ["金融商品取引法", "有価証券届出書", "インサイダー取引", "開示", "内部者取引"],

  // 租税法
  tax_income:      ["所得税", "総合課税", "分離課税", "給与所得", "事業所得", "譲渡所得"],
  tax_corporate:   ["法人税", "益金", "損金", "同族会社", "グループ法人税制", "受取配当"],
  tax_consumption: ["消費税", "課税売上", "仕入税額控除", "インボイス", "非課税"],
  tax_other:       ["相続税", "贈与税", "地方税", "固定資産税"],

  // 選択科目（経営学）
  elect_org:       ["経営組織", "組織論", "官僚制", "組織文化", "モチベーション", "リーダーシップ"],
  elect_strategy:  ["経営戦略", "競争優位", "ポーター", "SWOT", "ドメイン", "多角化"],
  elect_finance:   ["コーポレートファイナンス", "企業財務", "資本構成", "MM理論", "WACC", "配当政策", "β"],
  elect_marketing: ["マーケティング", "4P", "市場細分化", "製品戦略", "価格戦略"],
  elect_hr:        ["人的資源管理", "採用", "評価制度", "労働法", "人事"],
};

const POSITIVE_PATTERNS = [
  /わかった/, /理解した/, /理解できた/, /できた/, /解けた/,
  /完璧/, /バッチリ/, /マスター/, /得意/, /完了/,
  /覚えた/, /定着/, /スラスラ/, /大丈夫/, /いける/,
  /わかってきた/, /慣れてきた/, /だいぶ/,
];

const NEGATIVE_PATTERNS = [
  /わからない/, /わからん/, /難しい/, /むずい/, /全然/,
  /ダメ/, /できない/, /間違えた/, /ミスした/, /忘れた/,
  /曖昧/, /微妙/, /怪しい/, /あやしい/, /不安/, /まだ/,
];

const WEAK_PATTERNS = [
  /苦手/, /ニガテ/, /弱い/, /克服/, /要復習/,
];

export interface ParsedEntry {
  topicId: string;
  topicName: string;
  subjectName: string;
  sentiment: "positive" | "negative" | "weak" | "neutral";
  confidence: number;
}

const getSentimentInContext = (text: string, keyword: string): "positive" | "negative" | "weak" | "neutral" => {
  const idx = text.indexOf(keyword);
  if (idx === -1) return "neutral";
  const context = text.slice(Math.max(0, idx - 60), Math.min(text.length, idx + keyword.length + 100));

  if (WEAK_PATTERNS.some((p) => p.test(context))) return "weak";
  const posScore = POSITIVE_PATTERNS.filter((p) => p.test(context)).length;
  const negScore = NEGATIVE_PATTERNS.filter((p) => p.test(context)).length;
  if (posScore > negScore) return "positive";
  if (negScore > posScore) return "negative";

  if (WEAK_PATTERNS.some((p) => p.test(text))) return "weak";
  const gPos = POSITIVE_PATTERNS.filter((p) => p.test(text)).length;
  const gNeg = NEGATIVE_PATTERNS.filter((p) => p.test(text)).length;
  if (gPos > gNeg) return "positive";
  if (gNeg > gPos) return "negative";
  return "neutral";
};

const getAllSubjects = (): Subject[] => {
  const seen = new Set<string>();
  return [...SUBJECTS_ESSAY].filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
};

export const parseStudyText = (text: string): ParsedEntry[] => {
  const results: ParsedEntry[] = [];
  const subjects = getAllSubjects();
  const foundTopicIds = new Set<string>();

  for (const [topicId, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const matchedKeyword = keywords.find((kw) => text.includes(kw));
    if (!matchedKeyword || foundTopicIds.has(topicId)) continue;

    let subjectName = "";
    let topicName = "";
    for (const subject of subjects) {
      const topic = subject.topics.find((t) => t.id === topicId);
      if (topic) { subjectName = subject.name; topicName = topic.name; break; }
    }
    if (!topicName) continue;

    foundTopicIds.add(topicId);
    const sentiment = getSentimentInContext(text, matchedKeyword);
    results.push({ topicId, topicName, subjectName, sentiment, confidence: 0.8 });
  }

  return results;
};

export const sentimentToResult = (
  sentiment: "positive" | "negative" | "weak" | "neutral"
): "correct" | "wrong" | "weak" | "neutral" => {
  if (sentiment === "positive") return "correct";
  if (sentiment === "weak") return "weak";
  if (sentiment === "negative") return "wrong";
  return "neutral";
};
