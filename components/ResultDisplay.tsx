"use client";

import { useRef, useState } from "react";
import type { AnalysisResult } from "@/types";
// 导出工具函数
import { downloadPdf } from "@/lib/exportPdf";
import { downloadMarkdown } from "@/lib/exportMarkdown";

// ===== 分析结果展示组件（美化版） =====

export default function ResultDisplay({ result }: { result: AnalysisResult }) {
  // 获取评级
  const grade = getGrade(result.totalScore);
  // 获取内容区的 DOM 引用（给 html2canvas 截图用）
  const contentRef = useRef<HTMLDivElement>(null);
  // PDF 生成中的状态
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // 处理 PDF 导出
  const handleExportPdf = async () => {
    if (!contentRef.current) return;
    setIsExportingPdf(true);
    try {
      await downloadPdf(contentRef.current);
    } catch (err) {
      console.error("PDF 导出失败：", err);
      alert("PDF 导出失败，请重试");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // 处理 Markdown 导出
  const handleExportMarkdown = () => {
    downloadMarkdown(result);
  };

  return (
    <div>
      {/* 分析内容（给 PDF 导出截图的区域） */}
      <div
        ref={contentRef}
        className="space-y-5 text-sm animate-[fadeIn_0.4s_ease-out]"
      >
        {/* ===== 总分：环形进度条 ===== */}
        <ScoreRing
          score={result.totalScore}
          grade={grade}
          skillScore={result.skillScore}
          projectScore={result.projectScore}
        />

        {/* ===== 子项分数：进度条 ===== */}
        <SubScoreBars
          skillScore={result.skillScore}
          projectScore={result.projectScore}
        />

        {/* ===== 技能对比 ===== */}
        <SkillComparison
          matched={result.matchedSkills}
          missing={result.missingSkills}
          total={result.jdRequiredSkills.length}
        />

        {/* ===== 项目经历评估 ===== */}
        <ProjectCard assessment={result.projectAssessment} />

        {/* ===== 改进建议 ===== */}
        <SuggestionsList suggestions={result.suggestions} />
      </div>

      {/* ===== 导出按钮区 ===== */}
      <div className="mt-5 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-400 mb-3">📥 导出分析结果</p>
        <div className="flex gap-3">
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4
                       bg-red-50 text-red-700 border border-red-200 rounded-lg
                       hover:bg-red-100 active:scale-[0.98] transition-all
                       text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExportingPdf ? (
              <>
                <span className="animate-spin">⏳</span>
                生成中…
              </>
            ) : (
              <>
                <span>📕</span>
                导出 PDF
              </>
            )}
          </button>
          <button
            onClick={handleExportMarkdown}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4
                       bg-blue-50 text-blue-700 border border-blue-200 rounded-lg
                       hover:bg-blue-100 active:scale-[0.98] transition-all
                       text-sm font-medium"
          >
            <span>📝</span>
            导出 Markdown
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== 子组件1：总分环形进度条 =====
function ScoreRing({
  score,
  grade,
  skillScore,
  projectScore,
}: {
  score: number;
  grade: ReturnType<typeof getGrade>;
  skillScore: number;
  projectScore: number;
}) {
  // SVG 环形进度条参数
  const size = 140; // 圆的直径
  const strokeWidth = 10; // 线条粗细
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center py-2">
      {/* 评级标签 */}
      <span
        className={`text-xs font-bold px-3 py-0.5 rounded-full mb-3 ${grade.badgeColor}`}
      >
        {grade.label}
      </span>

      {/* SVG 环形图 */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* 背景圆环 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* 进度圆环 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={grade.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* 圆环中间的文字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-gray-800">
            {score}
          </span>
          <span className="text-xs text-gray-400">满分 100</span>
        </div>
      </div>

      {/* 底部分解说明 */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          技能 {skillScore}/50
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-violet-500" />
          项目 {projectScore}/50
        </span>
      </div>
    </div>
  );
}

// ===== 子组件2：子项分数进度条 =====
function SubScoreBars({
  skillScore,
  projectScore,
}: {
  skillScore: number;
  projectScore: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* 技能分数 */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">💡</span>
          <span className="text-xs font-semibold text-emerald-700">
            技能匹配
          </span>
        </div>
        <p className="text-2xl font-bold text-emerald-700 mb-2">
          {skillScore}
          <span className="text-xs font-normal text-emerald-500">/50</span>
        </p>
        {/* 小进度条 */}
        <div className="w-full h-1.5 bg-emerald-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${(skillScore / 50) * 100}%` }}
          />
        </div>
      </div>

      {/* 项目分数 */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📂</span>
          <span className="text-xs font-semibold text-violet-700">
            项目经历
          </span>
        </div>
        <p className="text-2xl font-bold text-violet-700 mb-2">
          {projectScore}
          <span className="text-xs font-normal text-violet-500">/50</span>
        </p>
        <div className="w-full h-1.5 bg-violet-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-700"
            style={{ width: `${(projectScore / 50) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ===== 子组件3：技能对比 =====
function SkillComparison({
  matched,
  missing,
  total,
}: {
  matched: string[];
  missing: string[];
  total: number;
}) {
  const matchRate = total > 0 ? Math.round((matched.length / total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-700 text-sm">
          🎯 技能对比
        </h4>
        <span className="text-xs text-gray-400">
          JD 要求 {total} 项 · 命中率 {matchRate}%
        </span>
      </div>

      {/* 匹配率总览条 */}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
          style={{ width: `${matchRate}%` }}
        />
      </div>

      {/* 命中技能 */}
      <div className="mb-3">
        <p className="text-xs font-medium text-emerald-600 mb-1.5">
          ✅ 已命中（{matched.length} 项）
        </p>
        <div className="flex flex-wrap gap-1.5">
          {matched.length > 0 ? (
            matched.map((s) => (
              <span
                key={s}
                className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700
                           rounded-md text-xs border border-emerald-200 font-medium"
              >
                {s}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400 italic">暂无命中技能</span>
          )}
        </div>
      </div>

      {/* 缺失技能 */}
      <div>
        <p className="text-xs font-medium text-red-500 mb-1.5">
          ❌ 缺失（{missing.length} 项）
        </p>
        <div className="flex flex-wrap gap-1.5">
          {missing.length > 0 ? (
            missing.map((s) => (
              <span
                key={s}
                className="inline-flex items-center px-2.5 py-1 bg-red-50 text-red-600
                           rounded-md text-xs border border-red-200 font-medium"
              >
                {s}
              </span>
            ))
          ) : (
            <span className="text-xs text-emerald-500 font-medium">
              全部命中，太棒了！🎉
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== 子组件4：项目经历卡片 =====
function ProjectCard({
  assessment,
}: {
  assessment: AnalysisResult["projectAssessment"];
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h4 className="font-semibold text-gray-700 text-sm mb-3">
        📂 项目经历评估
      </h4>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* 项目数量 */}
        <div className="text-center bg-blue-50 rounded-lg p-3 border border-blue-100">
          <p className="text-2xl font-bold text-blue-600">
            {assessment.projectCount}
          </p>
          <p className="text-xs text-blue-500 mt-0.5">个项目</p>
        </div>

        {/* 量化数据 */}
        <div
          className={`text-center rounded-lg p-3 border ${
            assessment.hasQuantifiableData
              ? "bg-emerald-50 border-emerald-100"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <p className="text-2xl">
            {assessment.hasQuantifiableData ? "✅" : "❌"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">量化数据</p>
        </div>

        {/* 技术覆盖数 */}
        <div className="text-center bg-purple-50 rounded-lg p-3 border border-purple-100">
          <p className="text-2xl font-bold text-purple-600">
            {assessment.techCoverage.length}
          </p>
          <p className="text-xs text-purple-500 mt-0.5">项技术</p>
        </div>
      </div>

      {/* 技术覆盖列表 */}
      {assessment.techCoverage.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1.5">技术栈覆盖</p>
          <div className="flex flex-wrap gap-1">
            {assessment.techCoverage.map((t) => (
              <span
                key={t}
                className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600
                           rounded text-xs border border-gray-200"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 量化数据片段 */}
      {assessment.snippets.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-1.5">发现的量化数据</p>
          <div className="flex flex-wrap gap-1">
            {assessment.snippets.map((s, i) => (
              <code
                key={i}
                className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-700
                           rounded text-xs border border-amber-200 font-mono"
              >
                {s}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 子组件5：改进建议列表 =====
function SuggestionsList({
  suggestions,
}: {
  suggestions: AnalysisResult["suggestions"];
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h4 className="font-semibold text-gray-700 text-sm mb-3">
        💡 改进建议
        <span className="text-xs text-gray-400 font-normal ml-1">
          （{suggestions.length} 条）
        </span>
      </h4>

      <ul className="space-y-2">
        {suggestions.map((s, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 p-3 rounded-lg transition-colors hover:bg-gray-50"
          >
            {/* 优先级图标 */}
            <span
              className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                s.priority === "high"
                  ? "bg-red-100 text-red-600"
                  : s.priority === "medium"
                    ? "bg-amber-100 text-amber-600"
                    : "bg-blue-100 text-blue-600"
              }`}
            >
              {s.priority === "high" ? "!" : s.priority === "medium" ? "·" : "i"}
            </span>
            <div className="flex-1 min-w-0">
              {/* 类别 + 优先级 标签 */}
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs text-gray-500">
                  {s.category === "skill" ? "技能" : "项目"}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    s.priority === "high"
                      ? "bg-red-50 text-red-700"
                      : s.priority === "medium"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {s.priority === "high"
                    ? "高优先"
                    : s.priority === "medium"
                      ? "中优先"
                      : "低优先"}
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{s.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ===== 辅助：根据分数返回评级信息 =====
function getGrade(score: number) {
  if (score >= 85)
    return {
      label: "🌟 优秀匹配",
      color: "#10b981",
      badgeColor: "bg-emerald-100 text-emerald-700",
    };
  if (score >= 70)
    return {
      label: "👍 良好匹配",
      color: "#3b82f6",
      badgeColor: "bg-blue-100 text-blue-700",
    };
  if (score >= 50)
    return {
      label: "📝 一般匹配",
      color: "#f59e0b",
      badgeColor: "bg-amber-100 text-amber-700",
    };
  return {
    label: "🔻 需大幅提升",
    color: "#ef4444",
    badgeColor: "bg-red-100 text-red-700",
  };
}
