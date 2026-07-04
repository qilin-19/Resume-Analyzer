// ===== Markdown 导出 =====
// 把分析结果转成格式化的 Markdown 文本，然后触发浏览器下载

import type { AnalysisResult } from "@/types";

/**
 * 生成 Markdown 内容字符串
 * 所有字段都加防御性默认值，防止 HMR 热更新时传入不完整对象
 */
function buildMarkdown(result: AnalysisResult): string {
  const now = new Date().toLocaleString("zh-CN");
  const grade = getGradeLabel(result?.totalScore ?? 0);

  // 安全解构 + 默认值（防御热更新导致字段缺失）
  const matched = result?.matchedSkills ?? [];
  const missing = result?.missingSkills ?? [];
  const jdSkills = result?.jdRequiredSkills ?? [];
  const projectAssessment = result?.projectAssessment ?? {
    projectCount: 0,
    hasQuantifiableData: false,
    techCoverage: [],
    snippets: [],
  };
  const suggestions = result?.suggestions ?? [];

  const lines = [
    `# 📄 简历评分分析报告`,
    ``,
    `> 生成时间：${now}`,
    ``,
    `---`,
    ``,
    `## 📊 综合评分`,
    ``,
    `| 项目 | 得分 | 满分 | 评级 |`,
    `|------|------|------|------|`,
    `| **总分** | **${result.totalScore}** | 100 | ${grade} |`,
    `| 技能匹配 | ${result.skillScore} | 50 | ${getBar(result.skillScore, 50)} |`,
    `| 项目经历 | ${result.projectScore} | 50 | ${getBar(result.projectScore, 50)} |`,
    ``,
    `---`,
    ``,
    `## 🎯 技能对比`,
    ``,
    `JD 共识别出 **${jdSkills.length}** 项技能要求，命中 **${matched.length}** 项，命中率 **${jdSkills.length > 0 ? Math.round((matched.length / jdSkills.length) * 100) : 0}%**。`,
    ``,
    `### ✅ 已命中（${matched.length} 项）`,
    ``,
    matched.length > 0
      ? matched.map((s) => `- ${s}`).join("\n")
      : `- （无）`,
    ``,
    `### ❌ 缺失（${missing.length} 项）`,
    ``,
    missing.length > 0
      ? missing.map((s) => `- ${s}`).join("\n")
      : `- 全部命中 🎉`,
    ``,
    `---`,
    ``,
    `## 📂 项目经历评估`,
    ``,
    `| 指标 | 结果 |`,
    `|------|------|`,
    `| 项目数量 | ${projectAssessment.projectCount} 个 |`,
    `| 量化数据 | ${projectAssessment.hasQuantifiableData ? "✅ 有" : "❌ 无"} |`,
    `| 技术覆盖 | ${projectAssessment.techCoverage.length > 0 ? projectAssessment.techCoverage.join("、") : "未识别到明确技术栈"} |`,
  ];

  // 量化数据片段
  if (projectAssessment.snippets.length > 0) {
    lines.push(``, `发现的量化数据：`);
    for (const s of projectAssessment.snippets) {
      lines.push(`- \`${s}\``);
    }
  }

  lines.push(
    ``,
    `---`,
    ``,
    `## 💡 改进建议`,
    ``
  );

  if (suggestions.length > 0) {
    for (const s of suggestions) {
      const priority =
        s.priority === "high"
          ? "🔴 高优先"
          : s.priority === "medium"
            ? "🟡 中优先"
            : "🔵 低优先";
      const category = s.category === "skill" ? "【技能】" : "【项目】";
      lines.push(`- ${priority} ${category} ${s.text}`);
    }
  } else {
    lines.push(`暂无改进建议，简历与 JD 匹配度良好。`);
  }

  lines.push(
    ``,
    `---`,
    ``,
    `*本报告由「简历评分分析器」自动生成*`
  );

  return lines.join("\n");
}

/**
 * 触发浏览器下载 Markdown 文件
 */
export function downloadMarkdown(result: AnalysisResult): void {
  const content = buildMarkdown(result);
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  // 创建一个隐藏的 <a> 标签，模拟点击下载
  const a = document.createElement("a");
  a.href = url;
  a.download = `简历分析报告_${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url); // 释放内存
}

// ===== 辅助函数 =====

/** 根据分数返回评级文字 */
function getGradeLabel(score: number): string {
  if (score >= 85) return "🌟 优秀匹配";
  if (score >= 70) return "👍 良好匹配";
  if (score >= 50) return "📝 一般匹配";
  return "🔻 需大幅提升";
}

/** 生成一个纯文本进度条 (用于 Markdown) */
function getBar(score: number, max: number): string {
  const ratio = score / max;
  const filled = Math.round(ratio * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}
