import { AppState, CustomTopic, Subject } from "./types";

export const SUBJECTS_SHORT: Subject[] = [
  {
    id: "financial_calc",
    name: "財務会計論（計算）",
    shortName: "財計",
    maxScore: 100,
    passingScore: 40,
    topics: [
      { id: "fin_revenue",       subjectId: "financial_calc", name: "収益認識基準",                     weight: 5 },
      { id: "fin_financial_ins", subjectId: "financial_calc", name: "金融商品会計",                     weight: 5 },
      { id: "fin_consolidation", subjectId: "financial_calc", name: "連結財務諸表",                     weight: 5 },
      { id: "fin_tangible",      subjectId: "financial_calc", name: "有形固定資産・減価償却",           weight: 4 },
      { id: "fin_lease",         subjectId: "financial_calc", name: "リース会計",                       weight: 4 },
      { id: "fin_retirement",    subjectId: "financial_calc", name: "退職給付会計",                     weight: 4 },
      { id: "fin_tax_effect",    subjectId: "financial_calc", name: "税効果会計",                       weight: 4 },
      { id: "fin_merger",        subjectId: "financial_calc", name: "企業結合・事業分離",               weight: 4 },
      { id: "fin_impairment",    subjectId: "financial_calc", name: "固定資産の減損",                   weight: 4 },
      { id: "fin_cashflow",      subjectId: "financial_calc", name: "キャッシュ・フロー計算書",         weight: 4 },
      { id: "fin_intangible",    subjectId: "financial_calc", name: "無形固定資産・研究開発費",         weight: 3 },
      { id: "fin_forex",         subjectId: "financial_calc", name: "外貨換算会計",                     weight: 3 },
      { id: "fin_hedge",         subjectId: "financial_calc", name: "デリバティブ・ヘッジ会計",         weight: 3 },
      { id: "fin_provision",     subjectId: "financial_calc", name: "引当金・負債会計",                 weight: 3 },
      { id: "fin_inventory",     subjectId: "financial_calc", name: "棚卸資産会計",                     weight: 3 },
      { id: "fin_equity",        subjectId: "financial_calc", name: "純資産会計",                       weight: 3 },
      { id: "fin_segment",       subjectId: "financial_calc", name: "セグメント情報",                   weight: 2 },
      { id: "fin_asset_retire",  subjectId: "financial_calc", name: "資産除去債務",                     weight: 3 },
    ],
  },
  {
    id: "financial_theory",
    name: "財務諸表論（理論）",
    shortName: "財理",
    maxScore: 100,
    passingScore: 40,
    topics: [
      { id: "fin_principles",      subjectId: "financial_theory", name: "企業会計原則・概念フレームワーク", weight: 5 },
      { id: "fin_th_recognition",  subjectId: "financial_theory", name: "収益・費用の認識基準（理論）",   weight: 4 },
      { id: "fin_th_assets",       subjectId: "financial_theory", name: "資産・負債の評価基準（理論）",   weight: 4 },
      { id: "fin_th_display",      subjectId: "financial_theory", name: "財務諸表の表示・開示",           weight: 4 },
      { id: "fin_th_policy",       subjectId: "financial_theory", name: "会計方針・見積もりの変更",       weight: 3 },
      { id: "fin_th_ifrs",         subjectId: "financial_theory", name: "IFRS・会計基準の国際的動向",    weight: 3 },
      { id: "fin_th_disclosure",   subjectId: "financial_theory", name: "注記・ディスクロージャー",       weight: 3 },
    ],
  },
  {
    id: "management",
    name: "管理会計論",
    shortName: "管理",
    maxScore: 100,
    passingScore: 40,
    topics: [
      { id: "mgmt_theory",      subjectId: "management", name: "原価計算基準・管理会計理論",      weight: 3 },
      { id: "mgmt_cost_item",   subjectId: "management", name: "費目別原価計算",                  weight: 3 },
      { id: "mgmt_individual",  subjectId: "management", name: "個別原価計算",                    weight: 4 },
      { id: "mgmt_process",     subjectId: "management", name: "総合原価計算",                    weight: 5 },
      { id: "mgmt_standard",    subjectId: "management", name: "標準原価計算",                    weight: 5 },
      { id: "mgmt_direct",      subjectId: "management", name: "直接原価計算",                    weight: 4 },
      { id: "mgmt_abc",         subjectId: "management", name: "活動基準原価計算（ABC）",         weight: 3 },
      { id: "mgmt_cvp",         subjectId: "management", name: "CVP分析・短期利益計画",           weight: 4 },
      { id: "mgmt_decision",    subjectId: "management", name: "意思決定会計",                    weight: 4 },
      { id: "mgmt_investment",  subjectId: "management", name: "設備投資の経済計算",              weight: 3 },
      { id: "mgmt_budget",      subjectId: "management", name: "予算管理・業績測定",              weight: 4 },
    ],
  },
  {
    id: "audit",
    name: "監査論",
    shortName: "監査",
    maxScore: 100,
    passingScore: 40,
    topics: [
      { id: "audit_concept",    subjectId: "audit", name: "監査の基礎概念",           weight: 4 },
      { id: "audit_risk",       subjectId: "audit", name: "リスク・アプローチ",       weight: 5 },
      { id: "audit_internal",   subjectId: "audit", name: "内部統制の評価",           weight: 4 },
      { id: "audit_plan",       subjectId: "audit", name: "監査計画・監査手続",       weight: 4 },
      { id: "audit_evidence",   subjectId: "audit", name: "監査証拠・実証手続",       weight: 4 },
      { id: "audit_report",     subjectId: "audit", name: "監査報告書",               weight: 3 },
      { id: "audit_quality",    subjectId: "audit", name: "品質管理基準",             weight: 3 },
      { id: "audit_ethics",     subjectId: "audit", name: "倫理規則・独立性",         weight: 4 },
      { id: "audit_it",         subjectId: "audit", name: "IT環境下の監査",           weight: 3 },
      { id: "audit_group",      subjectId: "audit", name: "グループ監査・特殊領域",   weight: 2 },
    ],
  },
  {
    id: "corporate",
    name: "企業法",
    shortName: "企業法",
    maxScore: 100,
    passingScore: 40,
    topics: [
      { id: "corp_establish",   subjectId: "corporate", name: "会社の設立・定款",             weight: 3 },
      { id: "corp_share",       subjectId: "corporate", name: "株式・新株予約権",             weight: 4 },
      { id: "corp_meeting",     subjectId: "corporate", name: "機関設計・株主総会",           weight: 4 },
      { id: "corp_director",    subjectId: "corporate", name: "取締役・取締役会",             weight: 5 },
      { id: "corp_calc",        subjectId: "corporate", name: "計算・配当",                   weight: 4 },
      { id: "corp_reorg",       subjectId: "corporate", name: "組織再編（合併・分割等）",     weight: 4 },
      { id: "corp_bond",        subjectId: "corporate", name: "社債",                         weight: 2 },
      { id: "corp_finlaw",      subjectId: "corporate", name: "金融商品取引法",               weight: 4 },
    ],
  },
];

export const SUBJECTS_ESSAY: Subject[] = [
  ...SUBJECTS_SHORT.map((s) => ({ ...s, passingScore: 0 })),
  {
    id: "tax",
    name: "租税法",
    shortName: "租税",
    maxScore: 100,
    passingScore: 0,
    topics: [
      { id: "tax_income",      subjectId: "tax", name: "所得税法",       weight: 3 },
      { id: "tax_corporate",   subjectId: "tax", name: "法人税法",       weight: 5 },
      { id: "tax_consumption", subjectId: "tax", name: "消費税法",       weight: 4 },
      { id: "tax_other",       subjectId: "tax", name: "その他の税法",   weight: 2 },
    ],
  },
  {
    id: "elective",
    name: "選択科目（経営学）",
    shortName: "選択",
    maxScore: 100,
    passingScore: 0,
    topics: [
      { id: "elect_org",       subjectId: "elective", name: "経営組織論",                 weight: 4 },
      { id: "elect_strategy",  subjectId: "elective", name: "経営戦略論",                 weight: 4 },
      { id: "elect_finance",   subjectId: "elective", name: "財務管理論（コーポレートファイナンス）", weight: 5 },
      { id: "elect_marketing", subjectId: "elective", name: "マーケティング管理論",       weight: 3 },
      { id: "elect_hr",        subjectId: "elective", name: "人的資源管理論",             weight: 3 },
    ],
  },
];

// ── 日商簿記3級 ────────────────────────────────────────────
export const SUBJECTS_BOKI3: Subject[] = [
  {
    id: "boki3_commercial",
    name: "商業簿記",
    shortName: "商業",
    maxScore: 100,
    passingScore: 70,
    topics: [
      { id: "b3_basic",      subjectId: "boki3_commercial", name: "仕訳・勘定記入の基礎",             weight: 5 },
      { id: "b3_cash",       subjectId: "boki3_commercial", name: "現金・預金",                       weight: 4 },
      { id: "b3_goods",      subjectId: "boki3_commercial", name: "商品売買（三分法・分記法）",         weight: 5 },
      { id: "b3_assets",     subjectId: "boki3_commercial", name: "固定資産・減価償却",               weight: 4 },
      { id: "b3_provision",  subjectId: "boki3_commercial", name: "引当金",                           weight: 3 },
      { id: "b3_accrual",    subjectId: "boki3_commercial", name: "費用・収益の見越し・繰延べ",       weight: 4 },
      { id: "b3_trial",      subjectId: "boki3_commercial", name: "試算表・精算表",                   weight: 5 },
      { id: "b3_statements", subjectId: "boki3_commercial", name: "財務諸表（損益計算書・貸借対照表）", weight: 5 },
      { id: "b3_books",      subjectId: "boki3_commercial", name: "帳簿・伝票・補助簿",               weight: 3 },
      { id: "b3_tax",        subjectId: "boki3_commercial", name: "税金（消費税・法人税等）",          weight: 3 },
    ],
  },
];

// ── 日商簿記2級 ────────────────────────────────────────────
export const SUBJECTS_BOKI2: Subject[] = [
  {
    id: "boki2_commercial",
    name: "商業簿記",
    shortName: "商業",
    maxScore: 60,
    passingScore: 42,
    topics: [
      { id: "b2_goods",       subjectId: "boki2_commercial", name: "商品売買・特殊商品売買",           weight: 4 },
      { id: "b2_securities",  subjectId: "boki2_commercial", name: "有価証券",                         weight: 4 },
      { id: "b2_assets",      subjectId: "boki2_commercial", name: "固定資産・減価償却・除売却",       weight: 4 },
      { id: "b2_provision",   subjectId: "boki2_commercial", name: "引当金・負債会計",                 weight: 3 },
      { id: "b2_tax_effect",  subjectId: "boki2_commercial", name: "税効果会計",                       weight: 3 },
      { id: "b2_consolidate", subjectId: "boki2_commercial", name: "連結会計（基礎）",                 weight: 5 },
      { id: "b2_equity_stmt", subjectId: "boki2_commercial", name: "株主資本等変動計算書",             weight: 3 },
      { id: "b2_branch",      subjectId: "boki2_commercial", name: "本支店会計",                       weight: 3 },
      { id: "b2_statements",  subjectId: "boki2_commercial", name: "財務諸表の作成",                   weight: 4 },
      { id: "b2_forex",       subjectId: "boki2_commercial", name: "外貨換算会計",                     weight: 3 },
    ],
  },
  {
    id: "boki2_industrial",
    name: "工業簿記",
    shortName: "工業",
    maxScore: 40,
    passingScore: 28,
    topics: [
      { id: "b2_cost_item",   subjectId: "boki2_industrial", name: "費目別原価計算（材料・労務・経費）", weight: 4 },
      { id: "b2_job_order",   subjectId: "boki2_industrial", name: "個別原価計算",                     weight: 4 },
      { id: "b2_process",     subjectId: "boki2_industrial", name: "総合原価計算",                     weight: 5 },
      { id: "b2_standard",    subjectId: "boki2_industrial", name: "標準原価計算・差異分析",           weight: 5 },
      { id: "b2_direct",      subjectId: "boki2_industrial", name: "直接原価計算・CVP分析",            weight: 4 },
    ],
  },
];

// ── 日商簿記1級 ────────────────────────────────────────────
export const SUBJECTS_BOKI1: Subject[] = [
  {
    id: "boki1_commercial",
    name: "商業簿記",
    shortName: "商業",
    maxScore: 25,
    passingScore: 10,
    topics: [
      { id: "b1_goods",       subjectId: "boki1_commercial", name: "商品売買・特殊商品売買",           weight: 3 },
      { id: "b1_securities",  subjectId: "boki1_commercial", name: "有価証券・金融商品会計",           weight: 5 },
      { id: "b1_assets",      subjectId: "boki1_commercial", name: "固定資産・減価償却・減損",         weight: 4 },
      { id: "b1_provision",   subjectId: "boki1_commercial", name: "引当金・負債会計",                 weight: 3 },
      { id: "b1_equity",      subjectId: "boki1_commercial", name: "純資産会計",                       weight: 3 },
      { id: "b1_tax_effect",  subjectId: "boki1_commercial", name: "税効果会計",                       weight: 4 },
      { id: "b1_consolidate", subjectId: "boki1_commercial", name: "連結財務諸表",                     weight: 5 },
      { id: "b1_merger",      subjectId: "boki1_commercial", name: "企業結合・事業分離",               weight: 4 },
      { id: "b1_cashflow",    subjectId: "boki1_commercial", name: "キャッシュ・フロー計算書",         weight: 3 },
      { id: "b1_forex",       subjectId: "boki1_commercial", name: "外貨換算・デリバティブ",           weight: 4 },
      { id: "b1_lease",       subjectId: "boki1_commercial", name: "リース会計",                       weight: 3 },
      { id: "b1_retirement",  subjectId: "boki1_commercial", name: "退職給付会計",                     weight: 3 },
      { id: "b1_branch",      subjectId: "boki1_commercial", name: "本支店会計",                       weight: 2 },
    ],
  },
  {
    id: "boki1_accounting",
    name: "会計学",
    shortName: "会計学",
    maxScore: 25,
    passingScore: 10,
    topics: [
      { id: "b1_framework",   subjectId: "boki1_accounting", name: "企業会計原則・概念フレームワーク", weight: 5 },
      { id: "b1_recognition", subjectId: "boki1_accounting", name: "収益・費用の認識基準",             weight: 4 },
      { id: "b1_valuation",   subjectId: "boki1_accounting", name: "資産・負債の評価基準",             weight: 4 },
      { id: "b1_disclosure",  subjectId: "boki1_accounting", name: "財務諸表の表示・開示",             weight: 3 },
      { id: "b1_change",      subjectId: "boki1_accounting", name: "会計上の変更・誤謬の訂正",         weight: 3 },
      { id: "b1_ifrs",        subjectId: "boki1_accounting", name: "IFRS・国際的動向",                 weight: 3 },
    ],
  },
  {
    id: "boki1_industrial",
    name: "工業簿記",
    shortName: "工業",
    maxScore: 25,
    passingScore: 10,
    topics: [
      { id: "b1_cost_item",   subjectId: "boki1_industrial", name: "費目別原価計算",                   weight: 4 },
      { id: "b1_job_order",   subjectId: "boki1_industrial", name: "個別原価計算",                     weight: 3 },
      { id: "b1_process",     subjectId: "boki1_industrial", name: "総合原価計算（等級別・組別）",     weight: 5 },
      { id: "b1_standard",    subjectId: "boki1_industrial", name: "標準原価計算・差異分析",           weight: 5 },
      { id: "b1_direct",      subjectId: "boki1_industrial", name: "直接原価計算",                     weight: 4 },
      { id: "b1_budget",      subjectId: "boki1_industrial", name: "予算管理・予算差異分析",           weight: 4 },
    ],
  },
  {
    id: "boki1_cost",
    name: "原価計算",
    shortName: "原計",
    maxScore: 25,
    passingScore: 10,
    topics: [
      { id: "b1_abc",         subjectId: "boki1_cost", name: "ABC（活動基準原価計算）",                weight: 3 },
      { id: "b1_cvp",         subjectId: "boki1_cost", name: "CVP分析・短期利益計画",                  weight: 4 },
      { id: "b1_decision",    subjectId: "boki1_cost", name: "意思決定会計（短期・長期）",             weight: 5 },
      { id: "b1_investment",  subjectId: "boki1_cost", name: "設備投資の意思決定",                     weight: 4 },
      { id: "b1_performance", subjectId: "boki1_cost", name: "業績管理・責任会計",                     weight: 3 },
    ],
  },
];

export const getSubjects = (examType: string): Subject[] => {
  if (examType === "essay")  return SUBJECTS_ESSAY;
  if (examType === "boki1")  return SUBJECTS_BOKI1;
  if (examType === "boki2")  return SUBJECTS_BOKI2;
  if (examType === "boki3")  return SUBJECTS_BOKI3;
  return SUBJECTS_SHORT;
};

// 名前オーバーライド＋カスタム論点を適用した科目リストを返す
export const getEffectiveSubjects = (examType: string, state: AppState): Subject[] => {
  const base     = getSubjects(examType);
  const overrides = state.topicNameOverrides ?? {};
  const customs   = state.customTopics       ?? [];

  return base.map(s => ({
    ...s,
    topics: [
      ...s.topics.map(t => ({
        ...t,
        name: overrides[t.id] ?? t.name,
      })),
      ...(customs as CustomTopic[])
        .filter(ct => ct.subjectId === s.id)
        .map(ct => ({
          id:        ct.id,
          subjectId: ct.subjectId,
          name:      overrides[ct.id] ?? ct.name,
          weight:    ct.weight,
        })),
    ],
  }));
};
