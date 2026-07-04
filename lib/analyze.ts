// ===== 简历分析引擎 =====
// 这是一个"纯函数"模块：输入（简历文本 + JD 文本）→ 处理 → 输出（分析结果）
//
// v2.0 升级：技能提取从"关键词匹配"升级为"LLM 阅读理解"
// v2.2 RAG 升级：LLM 分析前先从 knowledge/ 加载参考资料当"参考答案"

import type { AnalysisResult } from "@/types";
import { extractSkillsRaw, parseSkillsFromLLM } from "@/lib/llm";
import { loadKnowledge } from "@/lib/rag";

/**
 * analyzeResume —— 核心分析函数（异步版）
 * @param resumeText - mammoth 提取的简历纯文本
 * @param jdText - 用户粘贴的 JD 文本
 * @returns 分析结果（打分、技能对比、项目评估、建议）
 */
export async function analyzeResume(
  resumeText: string,
  jdText: string
): Promise<AnalysisResult> {
  // ===== 第0步：加载 RAG 参考资料 =====
  const { contextText: knowledgeContext } = loadKnowledge();

  // ===== 第1步：从 JD 中提取要求的技能关键词 =====
  // 策略：LLM 提取（带 RAG 上下文）+ 关键词匹配 → 取并集（三者互补）
  const keywordSkills = extractSkillsFromJDFallback(jdText);

  const llmRaw = await extractSkillsRaw(jdText, knowledgeContext);
  const llmSkills = llmRaw ? parseSkillsFromLLM(llmRaw) : [];

  // 并集去重
  const jdSkills = [...new Set([...keywordSkills, ...llmSkills])];

  // ===== 第2步：技能匹配 —— 逐项检查简历中是否出现 =====
  const { matched, missing } = matchSkills(resumeText, jdSkills);

  // ===== 第3步：项目经历评估 =====
  const projectAssessment = assessProjects(resumeText);

  // ===== 第4步：计算分数 =====
  const skillScore = calculateSkillScore(matched.length, jdSkills.length);
  const projectScore = calculateProjectScore(projectAssessment);
  const totalScore = skillScore + projectScore;

  // ===== 第5步：生成改进建议 =====
  const suggestions = generateSuggestions(
    missing,
    projectAssessment,
    resumeText
  );

  return {
    totalScore,
    skillScore,
    projectScore,
    matchedSkills: matched,
    missingSkills: missing,
    jdRequiredSkills: jdSkills,
    projectAssessment,
    suggestions,
  };
}

// ===== 以下是内部辅助函数（不对外暴露） =====

/**
 * （降级方案）从 JD 文本中提取技能关键词
 * 用"关键词字典 + 正则匹配"的方式，不依赖 AI 接口
 * 当 LLM 不可用时自动切换到这里
 */
function extractSkillsFromJDFallback(jdText: string): string[] {
  // 常见技术技能关键词库
  const techSkills = [
    // 前端
    "React", "Vue", "Angular", "Next.js", "Nuxt", "Svelte",
    "TypeScript", "JavaScript", "HTML5?", "CSS3?",
    "Tailwind", "Sass", "Less",
    "Webpack", "Vite", "Rollup", "esbuild",
    // 后端
    "Node.js", "Express", "Koa", "Nest(?:JS|js)?",
    "Python", "Django", "Flask", "FastAPI",
    "Java", "Spring(?:Boot|Cloud|MVC)?",
    "Go(?:lang)?", "Rust", "C#", "\\.NET",
    "PHP", "Laravel",
    // 数据库
    "MySQL", "PostgreSQL", "MongoDB", "Redis",
    "Elasticsearch", "SQLite",
    // 云 & DevOps
    "Docker", "Kubernetes", "k8s",
    "AWS", "Azure", "GCP|Google Cloud",
    "CI/CD", "Jenkins", "GitHub Actions",
    "Nginx", "Linux",
    // 移动端
    "React Native", "Flutter", "Swift", "Kotlin",
    // 其他
    "Git", "REST(?:ful)?\\s*API", "GraphQL",
    "gRPC", "WebSocket",
    "Agile|Scrum|敏捷",
    "Figma", "Sketch",
  ];

  // 中文技能描述（常见的 JD 表达方式）
  const cnSkillPatterns = [
    "前端开发", "后端开发", "全栈",
    "移动端开发", "小程序开发",
    "微服务", "分布式系统",
    "性能优化", "系统架构",
    "数据分析", "机器学习", "深度学习",
    "自动化测试", "单元测试",
    "项目管理", "技术管理", "团队管理",
  ];

  const found: string[] = [];
  const lowerJD = jdText.toLowerCase();

  // 匹配英文技术关键词（忽略大小写）
  for (const skill of techSkills) {
    const regex = new RegExp(`\\b${skill}\\b`, "i");
    if (regex.test(jdText)) {
      // 提取匹配到的原始文本，保持好看的大小写
      const match = jdText.match(regex);
      if (match) {
        found.push(match[0]);
      }
    }
  }

  // 匹配中文技能描述
  for (const skill of cnSkillPatterns) {
    if (jdText.includes(skill)) {
      found.push(skill);
    }
  }

  // 去重
  return [...new Set(found)];
}

/**
 * 技能匹配：检查每个 JD 技能在简历中是否出现
 */
function matchSkills(
  resumeText: string,
  jdSkills: string[]
): { matched: string[]; missing: string[] } {
  const matched: string[] = [];
  const missing: string[] = [];
  const lowerResume = resumeText.toLowerCase();

  for (const skill of jdSkills) {
    // 精确匹配 + 容错（部分匹配）
    if (lowerResume.includes(skill.toLowerCase())) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  return { matched, missing };
}

/**
 * 评估项目经历
 */
function assessProjects(resumeText: string): AnalysisResult["projectAssessment"] {
  // 识别项目分隔的关键词
  const projectSeparators = [
    /项目名称[：:]/g,
    /项目描述[：:]/g,
    /项目经验/g,
    /项目经历/g,
    /项目[（(][一二三四五六七八九十\d]+[)）]/g,
    /###\s/g,        // 可能用 Markdown 标题分隔
    /第[一二三四五六七八九十\d]+[个项]/g,
  ];

  // 统计项目分隔符出现次数，用来估算项目数量
  let sepCount = 0;
  const snippets: string[] = [];
  for (const sep of projectSeparators) {
    const matches = resumeText.match(sep);
    if (matches) {
      sepCount += matches.length;
    }
  }

  // 如果没找到明确的项目标记，看看有没有"Project"或带编号的段落
  if (sepCount === 0) {
    const fallbackMatches = resumeText.match(/[Pp]roject\s*\d+/g);
    if (fallbackMatches) sepCount = fallbackMatches.length;
  }

  // 最少算 1 个项目（只要简历有文字，就说明至少有一段经历）
  const projectCount = Math.max(1, sepCount);

  // 检测是否包含量化数据
  const quantifiablePatterns = [
    /\d+%/,                    // 百分比
    /\d+\s*[个项次万]/g,       // 中文计量
    /提升|降低|增长|下降|提高|减少|增加|节省|缩短/g,
    /从.*到.*\d+/g,            // "从 100 提升到 500"
    /[Qq]\d+/,                 // 季度
    /\$\d+/,                   // 金额
  ];
  const hasQuantifiableData = quantifiablePatterns.some((p) =>
    p.test(resumeText)
  );

  // 提取量化数据片段
  for (const p of quantifiablePatterns.slice(0, 4)) {
    const m = resumeText.match(p);
    if (m && m.length > 0 && snippets.length < 5) {
      snippets.push(...m.slice(0, 3));
    }
  }

  // 检测覆盖的技术栈（在简历中出现的）
  const techKeywords = [
    "React", "Vue", "Angular", "TypeScript", "JavaScript", "Node.js",
    "Python", "Java", "Go", "Rust", "Docker", "Kubernetes", "AWS",
    "MySQL", "PostgreSQL", "MongoDB", "Redis", "Git", "Linux",
    "Next.js", "GraphQL", "REST API", "微服务", "Spring",
  ];
  const techCoverage = techKeywords.filter((t) =>
    resumeText.toLowerCase().includes(t.toLowerCase())
  );

  return {
    projectCount,
    hasQuantifiableData,
    techCoverage,
    snippets: [...new Set(snippets)].slice(0, 5),
  };
}

/**
 * 计算技能得分（满分 50）
 * 规则：JD 要求 0 项技能 → 给 25 分保底
 *       JD 要求 1+ 项技能 → 按匹配比例给分
 */
function calculateSkillScore(matchedCount: number, totalCount: number): number {
  if (totalCount === 0) return 25; // JD 没列技能，给中间分
  const ratio = matchedCount / totalCount;
  // 用平方根让低匹配率不会得 0 分（更符合直觉）
  return Math.round(ratio * 50);
}

/**
 * 计算项目经历得分（满分 50）
 */
function calculateProjectScore(
  assessment: AnalysisResult["projectAssessment"]
): number {
  let score = 0;

  // 项目数量：1 个=10分，2 个=15分，3+=20分
  if (assessment.projectCount >= 3) score += 20;
  else if (assessment.projectCount >= 2) score += 15;
  else score += 10;

  // 量化数据：有=15分，无=5分
  score += assessment.hasQuantifiableData ? 15 : 5;

  // 技术栈覆盖：每覆盖 1 项 +2 分，最多 15 分
  score += Math.min(15, assessment.techCoverage.length * 2);

  return Math.min(50, score);
}

/**
 * 生成针对性改进建议
 */
function generateSuggestions(
  missingSkills: string[],
  projectAssessment: AnalysisResult["projectAssessment"],
  resumeText: string
): AnalysisResult["suggestions"] {
  const suggestions: AnalysisResult["suggestions"] = [];

  // 针对每个缺失的技能生成建议
  for (const skill of missingSkills.slice(0, 8)) {
    suggestions.push({
      priority: "high",
      category: "skill",
      text: `建议学习并实践 ${skill}：可以通过官方文档入门，再找 1-2 个实战项目巩固，并在简历中体现出来`,
    });
  }

  // 如果项目数量少
  if (projectAssessment.projectCount < 3) {
    suggestions.push({
      priority: "medium",
      category: "project",
      text: `当前简历中识别到 ${projectAssessment.projectCount} 个项目经历，建议补充到至少 3 个，可以从个人项目、开源贡献或课程设计中挖掘`,
    });
  }

  // 如果没有量化数据
  if (!projectAssessment.hasQuantifiableData) {
    suggestions.push({
      priority: "high",
      category: "project",
      text: "项目经历中缺少量化成果（如「性能提升 30%」、「用户量增长 2 倍」），建议补充具体数据来增强说服力",
    });
  }

  // 如果技术覆盖偏少
  if (projectAssessment.techCoverage.length < 5) {
    suggestions.push({
      priority: "medium",
      category: "project",
      text: `简历中覆盖的技术栈较少（发现 ${projectAssessment.techCoverage.length} 项），建议补充你实际使用过的技术关键词，让 HR/ATS 系统更容易匹配`,
    });
  }

  return suggestions;
}
