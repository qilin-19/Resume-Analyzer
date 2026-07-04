// ===== 简历分析结果的类型定义 =====
// TypeScript 的类型（interface）就像数据的"身份证"，
// 规定了每个字段叫什么名、存什么类型的数据

/** 分析引擎的输入 */
export interface AnalyzeInput {
  resumeText: string;
  jdText: string;
}

/** 项目经历评估 */
export interface ProjectAssessment {
  /** 识别到的项目数量 */
  projectCount: number;
  /** 是否包含量化数据（数字、百分比、提升/降低等） */
  hasQuantifiableData: boolean;
  /** 简历中覆盖的技术栈列表 */
  techCoverage: string[];
  /** 项目相关文字片段（用于展示证据） */
  snippets: string[];
}

/** 一行改进建议 */
export interface Suggestion {
  /** 优先级：high = 急需改进，medium = 建议改进，low = 锦上添花 */
  priority: "high" | "medium" | "low";
  /** 类别：技能相关 or 项目经历相关 */
  category: "skill" | "project";
  /** 建议内容 */
  text: string;
}

/** 分析引擎的完整输出 */
export interface AnalysisResult {
  /** 总分 0-100 */
  totalScore: number;
  /** 技能得分 0-50 */
  skillScore: number;
  /** 项目经历得分 0-50 */
  projectScore: number;
  /** 简历中命中 JD 要求的技能 */
  matchedSkills: string[];
  /** JD 要求但简历中缺失的技能 */
  missingSkills: string[];
  /** JD 中识别出的所有技能要求（原始列表） */
  jdRequiredSkills: string[];
  /** 项目经历评估详情 */
  projectAssessment: ProjectAssessment;
  /** 针对性改进建议 */
  suggestions: Suggestion[];
}
