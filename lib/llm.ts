// ===== LangChain LLM 模块 =====
// 用 DeepSeek API（OpenAI 兼容）从 JD 中智能提取技能关键词
//
// v2.1 修复：去掉 withStructuredOutput（DeepSeek 的 tool calling 兼容性不稳定），
// 改用普通聊天模式 + 手动解析 JSON 数组。
// 同时在 analyze.ts 里做"LLM 结果 + 关键词结果"并集，取长补短。

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

// ===== 配置 DeepSeek 模型 =====
const model = new ChatOpenAI({
  model: "deepseek-chat",
  temperature: 0, // 0 = 每次结果一致
  apiKey: process.env.DEEPSEEK_API_KEY,
  configuration: {
    baseURL: "https://api.deepseek.com",
  },
});

// ===== 提示词模板 =====
// v2.2 RAG 升级：增加 {knowledgeContext} 占位符，
// 如果传入了参考资料，就拼进 system prompt 让 LLM 参考
const skillExtractionPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `你是一个专业的招聘需求分析助手。你的任务是从招聘 JD 中提取所有技能要求。

你的输出必须是**纯 JSON 数组**，没有任何其他文字。格式如下：
["技能1", "技能2", "技能3"]

{knowledgeContext}

规则：
1. 提取 JD 中所有明确提到的技术技能。常见的技术包括但不限于：
   前端：React, Vue, Angular, TypeScript, JavaScript, HTML, CSS, Tailwind, Webpack, Vite
   后端：Node.js, Python, Java, Go, Rust, C#, PHP, Django, Flask, Spring Boot, Express
   数据库：MySQL, PostgreSQL, MongoDB, Redis, Elasticsearch
   DevOps：Docker, Kubernetes, AWS, Azure, GCP, Jenkins, GitHub Actions, Nginx, Linux
   AI/ML：机器学习, 深度学习, NLP, LLM, Agent, 大模型, PyTorch, TensorFlow
   移动端：React Native, Flutter, Swift, Kotlin
   其他：Git, REST API, GraphQL, gRPC, WebSocket, 微服务, 敏捷开发

2. 对于 JD 中的模糊描述，推理出具体技能：
   - "容器化部署" → Docker, Kubernetes
   - "现代前端框架" → React, Vue, Angular
   - "关系型数据库" → MySQL, PostgreSQL
   - "CI/CD 流水线" → Jenkins, GitHub Actions

3. 提取 JD 中提到的软技能（沟通能力、团队协作、项目管理等）

4. 至少要提取 5 个技能。如果 JD 明确写了很多技能，就原样提取。

记住：只输出 JSON 数组本身，不要有任何解释。`,
  ],
  ["human", "请提取以下 JD 中的技能要求，只返回 JSON 数组：\n\n{jdText}"],
]);

// ===== 创建 LLM 链（普通聊天模式，不用 structured output） =====
const skillExtractionChain = skillExtractionPrompt.pipe(model);

/**
 * 用 LLM 从 JD 中提取技能关键词
 *
 * @param jdText - JD 文本
 * @param knowledgeContext - 参考资料文本（来自 RAG），没有时传空字符串
 * @returns 纯文本 JSON 数组，在 analyze.ts 里解析并做并集
 */
export async function extractSkillsRaw(
  jdText: string,
  knowledgeContext: string = ""
): Promise<string | null> {
  try {
    // 如果 RAG 有资料，拼成一段上下文提示；否则填空字符串
    const contextBlock = knowledgeContext
      ? `\n分析前请参考以下资料，它们描述了各岗位的标准技能要求，帮你更准确地判断：\n\n${knowledgeContext}\n`
      : "";

    const response = await skillExtractionChain.invoke({
      jdText,
      knowledgeContext: contextBlock,
    });
    // response.content 是 LLM 返回的文本（期望是 JSON 数组字符串）
    const text =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);
    console.log("DeepSeek 原始返回：", text.slice(0, 300));
    return text;
  } catch (error) {
    console.error("LLM 技能提取失败：", error);
    return null;
  }
}

/**
 * 从 LLM 返回的文本中尝试解析技能数组
 * 兼容各种可能的格式
 */
export function parseSkillsFromLLM(rawText: string): string[] {
  try {
    // 尝试直接解析 JSON
    const trimmed = rawText.trim();
    // 去掉可能的 markdown 代码块包裹 ```json ... ```
    const jsonStr = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      return parsed.filter((s) => typeof s === "string" && s.trim().length > 0);
    }
    // 如果是对象，尝试找 skills / skill 字段
    if (parsed && typeof parsed === "object") {
      const arr = parsed.skills || parsed.skill || parsed.data || [];
      if (Array.isArray(arr)) {
        return arr.filter((s) => typeof s === "string" && s.trim().length > 0);
      }
    }
  } catch {
    // JSON 解析失败，尝试用正则从文本中提取引号内的字符串
    const matches = rawText.match(/"([^"]+)"/g);
    if (matches) {
      return matches
        .map((m) => m.replace(/^"|"$/g, ""))
        .filter((s) => s.trim().length > 0);
    }
  }
  return [];
}
