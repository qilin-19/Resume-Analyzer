"use client";

import { useState } from "react";
// mammoth 是一个专门解析 .docx 文件的库，能把 Word 文档转成纯文本
import mammoth from "mammoth";
// analyzeResumeAction 是 Server Action，在服务端执行分析（保护 API Key）
import { analyzeResumeAction } from "@/app/actions";
import ResultDisplay from "@/components/ResultDisplay";

export default function Home() {
  // ===== 状态管理：记住页面上的各种数据 =====
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState(""); // 解析后的简历纯文本
  const [isParsing, setIsParsing] = useState(false); // 是否正在解析中
  const [parseError, setParseError] = useState(""); // 解析失败时的错误信息
  const [jdText, setJdText] = useState("");
  // ⬇️ 新增：分析结果和分析中的状态
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ===== 处理文件上传 + 解析 Word 文档 =====
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 校验文件类型：只允许 .docx（ mammoth 不支持旧版 .doc ）
    if (!file.name.endsWith(".docx")) {
      setParseError("目前只支持 .docx 格式，请上传 Word 2007 及以上版本的文件");
      setResumeFile(null);
      setResumeText("");
      return;
    }

    setResumeFile(file);
    setParseError("");
    setIsParsing(true);
    setResumeText("");

    try {
      // 把文件读成 ArrayBuffer（二进制数据），mammoth 才能处理
      const arrayBuffer = await file.arrayBuffer();
      // mammoth.extractRawText：把 .docx 里的文字提取出来，去掉格式
      const result = await mammoth.extractRawText({ arrayBuffer });
      setResumeText(result.value);

      // 如果提取出来是空的，提示用户
      if (!result.value.trim()) {
        setParseError("这个文档里没有检测到文字内容，请检查文件是否正确");
      }
    } catch (err) {
      console.error("简历解析失败：", err);
      setParseError("解析失败，请确认上传的是有效的 .docx 文件");
      setResumeFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  // ===== 处理分析按钮点击 =====
  const handleAnalyze = async () => {
    if (!resumeText.trim() || !jdText.trim()) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    // 用一个小延迟让 loading 状态有机会渲染（用户体验细节）
    await new Promise((r) => setTimeout(r, 300));

    // 调用 Server Action（在服务端执行，API Key 不会泄露到浏览器）
    const result = await analyzeResumeAction(resumeText, jdText);
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  // 判断按钮是否可点击：必须有简历文字 + 已填 JD
  const canAnalyze = resumeText.trim() !== "" && jdText.trim() !== "";

  return (
    <div className="flex flex-col min-h-screen">
      {/* ===== 顶部导航栏 ===== */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">📄</span>
          <h1 className="text-xl font-bold text-gray-800">简历评分分析器</h1>
          <span className="text-sm text-gray-400 ml-auto">
            上传简历 + 粘贴 JD，一键分析匹配度
          </span>
        </div>
      </header>

      {/* ===== 主体：左右两栏布局 ===== */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* ----- 左栏：输入区 ----- */}
          <div className="flex flex-col gap-6">
            {/* 上传简历区域 */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                📤 上传简历
              </h2>

              {/* 点击上传区域 */}
              <label
                className={`
                  flex flex-col items-center justify-center gap-3
                  border-2 border-dashed rounded-lg p-8 cursor-pointer
                  transition-colors duration-200
                  ${
                    resumeFile && !parseError
                      ? "border-green-300 bg-green-50"
                      : parseError
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
                  }
                `}
              >
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* 根据不同状态显示不同内容 */}
                {isParsing ? (
                  <>
                    <span className="text-3xl animate-bounce">⏳</span>
                    <span className="text-sm font-medium text-blue-600">
                      正在解析简历…
                    </span>
                  </>
                ) : parseError ? (
                  <>
                    <span className="text-3xl">⚠️</span>
                    <span className="text-sm font-medium text-red-600">
                      {parseError}
                    </span>
                    <span className="text-xs text-red-400">
                      点击重新选择
                    </span>
                  </>
                ) : resumeFile ? (
                  <>
                    <span className="text-3xl">✅</span>
                    <span className="text-sm font-medium text-green-700">
                      {resumeFile.name}
                    </span>
                    <span className="text-xs text-green-500">
                      解析成功 · 点击重新选择
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl">📁</span>
                    <span className="text-sm font-medium text-gray-600">
                      点击上传或拖拽文件到此处
                    </span>
                    <span className="text-xs text-gray-400">
                      支持 .docx 格式（Word 2007 及以上）
                    </span>
                  </>
                )}
              </label>

              {/* 简历文本预览（解析成功后显示前 300 字） */}
              {resumeText && !parseError && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">
                      📝 简历内容预览
                    </h3>
                    <span className="text-xs text-gray-400">
                      共 {resumeText.length} 字
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line max-h-40 overflow-y-auto">
                    {resumeText.length > 300
                      ? resumeText.slice(0, 300) + "…"
                      : resumeText}
                  </p>
                </div>
              )}
            </section>

            {/* JD 输入区域 */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex-1 flex flex-col">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                🎯 目标岗位 JD
              </h2>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="在此粘贴目标岗位的招聘要求（JD）…&#10;&#10;例如：&#10;• 熟练掌握 React 和 TypeScript&#10;• 有 3 年以上前端开发经验&#10;• 熟悉 Git 版本控制…"
                className="flex-1 w-full min-h-[200px] p-4 border border-gray-200 rounded-lg
                           resize-y text-sm leading-relaxed
                           placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-shadow duration-200"
              />
            </section>

            {/* 分析按钮 */}
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className={`
                w-full py-3 px-6 rounded-lg font-semibold text-base
                transition-all duration-200
                ${
                  canAnalyze
                    ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-md hover:shadow-lg"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              🔍 开始分析
            </button>
          </div>

          {/* ----- 右栏：结果展示区 ----- */}
          <div className="flex flex-col gap-6">
            <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex-1">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                📊 分析结果
              </h2>

              {/* 状态1：还没分析 */}
              {!analysisResult && !isAnalyzing && (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-400">
                  <span className="text-5xl mb-4">🔎</span>
                  <p className="text-sm">上传简历并输入 JD 后</p>
                  <p className="text-sm">点击「开始分析」查看结果</p>
                </div>
              )}

              {/* 状态2：分析中 */}
              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                  <span className="text-4xl mb-4 animate-spin">⚙️</span>
                  <p className="text-base font-medium text-blue-600">
                    正在分析中…
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    正在匹配技能、评估项目经历
                  </p>
                </div>
              )}

              {/* 状态3：分析完成 */}
              {analysisResult && !isAnalyzing && (
                <ResultDisplay result={analysisResult} />
              )}
            </section>
          </div>
        </div>
      </main>

      {/* ===== 底部信息 ===== */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <p className="text-center text-xs text-gray-400">
          简历评分分析器 — 帮助你精准匹配目标岗位
        </p>
      </footer>
    </div>
  );
}
