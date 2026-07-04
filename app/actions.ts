"use server";

// ===== Server Action =====
// 这行 "use server" 是关键：标记这个文件里的函数只能在服务器上运行。
// 好处：
//   1. API Key 留在服务器，浏览器看不到
//   2. LangChain 依赖的 Node.js 模块能正常工作
//   3. 客户端像调普通函数一样调它，Next.js 自动处理网络通信

import { analyzeResume } from "@/lib/analyze";
import type { AnalysisResult } from "@/types";

/**
 * 分析简历（服务端执行）
 * 客户端直接 import 并调用，就像调本地函数一样
 */
export async function analyzeResumeAction(
  resumeText: string,
  jdText: string
): Promise<AnalysisResult> {
  "use server";
  return analyzeResume(resumeText, jdText);
}
