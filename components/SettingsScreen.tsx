"use client";

interface Props {
  onBack: () => void;
  onPreviewOnboarding: () => void;
  onRedoOnboarding: () => void;
  onResetData: () => void;
}

export default function SettingsScreen({ onBack, onPreviewOnboarding, onRedoOnboarding, onResetData }: Props) {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-8 pt-2">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-2xl leading-none">←</button>
        <h1 className="text-xl font-bold">設定</h1>
      </div>

      <div className="space-y-3">
        {/* プレビュー */}
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-800">
            初期設定の確認
          </div>
          <button
            onClick={onPreviewOnboarding}
            className="w-full text-left px-4 py-4 hover:bg-gray-800 transition-all flex items-center gap-3"
          >
            <span className="text-xl">👁</span>
            <div>
              <div className="font-medium">初期設定をプレビュー</div>
              <div className="text-xs text-gray-500 mt-0.5">新規ユーザーの画面を確認する（データは変更されません）</div>
            </div>
            <span className="ml-auto text-gray-500">›</span>
          </button>
          <button
            onClick={onRedoOnboarding}
            className="w-full text-left px-4 py-4 hover:bg-gray-800 transition-all flex items-center gap-3 border-t border-gray-800"
          >
            <span className="text-xl">🔄</span>
            <div>
              <div className="font-medium">初期設定をやり直す</div>
              <div className="text-xs text-gray-500 mt-0.5">学習歴・点数を再入力して習熟度を上書きする</div>
            </div>
            <span className="ml-auto text-gray-500">›</span>
          </button>
        </div>

        {/* データ管理 */}
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-800">
            データ管理
          </div>
          <button
            onClick={onResetData}
            className="w-full text-left px-4 py-4 hover:bg-gray-800 transition-all flex items-center gap-3"
          >
            <span className="text-xl">🗑</span>
            <div>
              <div className="font-medium text-red-400">すべてのデータをリセット</div>
              <div className="text-xs text-gray-500 mt-0.5">学習記録・習熟度・設定をすべて削除して最初から始める</div>
            </div>
            <span className="ml-auto text-gray-500">›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
