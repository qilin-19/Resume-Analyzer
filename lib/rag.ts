// ===== RAG 模块（文件级检索增强生成） =====
// 最简单的 RAG：从 knowledge/ 目录读取所有 .md 文件，
// 拼成一段"参考资料"，塞进 LLM 的提示词里当"参考答案"
//
// 大白话解释：
//   RAG = 让 LLM 回答问题前先翻一下你的"小抄本"
//   这里的"小抄本"就是 knowledge/ 目录里的 markdown 文件
//   你自己编辑这些文件 → LLM 的分析就会跟着变 → 你可控

import fs from "fs";
import path from "path";

/** 单份参考资料 */
export interface KnowledgeDoc {
  /** 文件名（不含路径） */
  name: string;
  /** 文件内容 */
  content: string;
}

/**
 * 从 knowledge/ 目录加载所有参考资料
 * 在 Server Action 里调用，文件系统读取只在服务端执行
 *
 * @returns 参考资料列表 + 拼接好的上下文文本
 */
export function loadKnowledge(): {
  docs: KnowledgeDoc[];
  contextText: string;
} {
  const knowledgeDir = path.join(process.cwd(), "knowledge");

  // 目录不存在不报错——优雅降级，没有资料库就空着
  if (!fs.existsSync(knowledgeDir)) {
    console.log("RAG: knowledge/ 目录不存在，跳过资料加载");
    return { docs: [], contextText: "" };
  }

  const files = fs
    .readdirSync(knowledgeDir)
    .filter((f) => f.endsWith(".md"))
    .sort(); // 排序保证每次加载顺序一致

  if (files.length === 0) {
    console.log("RAG: knowledge/ 目录为空，跳过资料加载");
    return { docs: [], contextText: "" };
  }

  const docs: KnowledgeDoc[] = files.map((file) => {
    const filePath = path.join(knowledgeDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    return { name: file, content };
  });

  // 拼接成一段上下文，LLM 的 prompt 会引用它
  const contextText = docs
    .map((doc) => `### 参考资料：《${doc.name}》\n\n${doc.content}`)
    .join("\n\n---\n\n");

  console.log(
    `RAG: 已加载 ${docs.length} 份参考资料（${docs.map((d) => d.name).join("、")}）`
  );

  return { docs, contextText };
}
