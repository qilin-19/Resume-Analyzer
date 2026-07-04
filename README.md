# 📄 简历评分分析器（Resume Analyzer）

一个基于 **Next.js + LangChain + RAG** 的智能简历分析工具——上传简历、粘贴 JD，自动打分、对比技能、给出改进建议。

---

## 🎯 它能做什么

| 功能 | 说明 |
|------|------|
| 📤 **简历上传** | 支持上传 `.docx` 文件，自动提取纯文本 |
| 🎯 **JD 智能解析** | 粘贴招聘要求，LLM + 关键词双通道提取技能清单 |
| 📊 **综合打分** | 从「技能匹配」和「项目经历」两维度打分（满分 100） |
| ✅❌ **技能对比** | JD 要求的技能，哪些命中、哪些缺失，一目了然 |
| 💡 **改进建议** | 针对缺失技能和项目短板，给出具体可操作的优化方向 |
| 📥 **结果导出** | 支持导出 **PDF**（精美排版）和 **Markdown**（便于存档对比） |
| 📚 **RAG 增强** | 可编辑的资料库（`knowledge/`），让 LLM 参考你的评分标准 |

---

## 🛠 技术栈

| 技术 | 分类 | 作用 |
|------|------|------|
| **Next.js 16** | 全栈框架 | 前端页面 + 后端 API 一个项目搞定 |
| **React 19** | 前端库 | 组件化 UI，状态管理 |
| **TypeScript** | 语言 | 类型检查，减少 bug |
| **Tailwind CSS 4** | 样式 | 原子化 CSS，快速开发 |
| **LangChain** | LLM 框架 | Prompt 管理、模型调用、输出解析 |
| **DeepSeek** | 大模型 | 智能提取 JD 技能、理解模糊描述 |
| **RAG** | 检索增强 | 从 `knowledge/` 资料库加载参考标准，提升分析质量 |
| **mammoth.js** | 文档解析 | 把 `.docx` 转成纯文本 |
| **html2canvas + jsPDF** | PDF 生成 | 结果区截图 → 生成 PDF 下载 |

### 架构亮点

- ✅ **降级兜底**：LLM 调用失败 → 自动切换关键词匹配，任何时候都能用
- ✅ **双通道并集**：LLM 提取 + 关键词提取取并集，不漏技能
- ✅ **Server Action**：API Key 留在服务端，浏览器看不到
- ✅ **可配置 RAG**：编辑 `knowledge/*.md` 即可自定义评分标准，无需改代码

---

## 🚀 怎么跑起来

### 1. 克隆项目

```bash
git clone <https://github.com/Frankwong-do/Resume-Analyzer>
cd resume-analyzer
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 API Key

在项目根目录创建 `.env.local` 文件：

```env
DEEPSEEK_API_KEY=你的DeepSeek_API_Key
```

> API Key 在 [platform.deepseek.com](https://platform.deepseek.com) 免费获取，新用户有赠送额度。

### 4. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 `http://localhost:3000`

### 5. 测试

1. 准备一份 `.docx` 简历（或用 `test-files/sample-resume.md` 的内容存成 Word）
2. 粘贴 JD（或用 `test-files/sample-jd.md` 的内容）
3. 点击「🔍 开始分析」
4. 查看打分结果 → 导出 PDF / Markdown

---

## 📁 项目结构

```
resume-analyzer/
├── app/
│   ├── actions.ts              # Server Action（API Key 安全）
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 主页面
│   └── globals.css             # 全局样式 + 淡入动画
├── components/
│   └── ResultDisplay.tsx       # 结果展示组件（环形图、对比表、建议列表）
├── lib/
│   ├── analyze.ts              # 核心分析引擎（技能匹配、项目评估、打分）
│   ├── llm.ts                  # LangChain + DeepSeek 封装
│   ├── rag.ts                  # RAG 模块（读取 knowledge/ 资料库）
│   ├── exportPdf.ts            # PDF 导出
│   └── exportMarkdown.ts       # Markdown 导出
├── types/
│   └── index.ts                # TypeScript 类型定义
├── knowledge/                  # 📚 RAG 资料库（你随便改）
│   ├── skills-reference.md     # 各岗位技能标准参考
│   └── grading-guide.md        # 打分标准参考
├── test-files/                 # 🧪 测试用文件
│   ├── sample-resume.md        # 示例简历
│   └── sample-jd.md            # 示例 JD
└── package.json
```

---

## 🔄 数据流

```
用户上传 .docx → mammoth 解析 → 纯文本
用户粘贴 JD ──────────────────→ 纯文本
                                    │
                    ┌───────────────┘
                    ▼
              Server Action
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   loadKnowledge  LLM提取    关键词匹配
   (RAG资料库)   (DeepSeek)  (60+关键词字典)
        │           │           │
        └───────────┼───────────┘
                    ▼
              并集去重 → 技能列表
                    │
                    ▼
              技能匹配 + 项目评估
                    │
                    ▼
              打分 + 改进建议
                    │
                    ▼
              结果展示 + 导出
```

---

## 🎓 适合写在简历里

如果你想把这个项目写进自己的简历，可以这样描述：

> **简历智能分析平台** —— 独立全栈项目
> - 基于 Next.js + LangChain 搭建，集成 DeepSeek 大模型实现 JD 技能智能提取
> - 使用 RAG 架构加载可配置资料库，提升分析准确率和可解释性
> - 支持 .docx 解析、多维度打分（技能+项目）、PDF/Markdown 导出
> - 采用 Server Action 保护 API Key，关键词匹配作为 LLM 降级兜底方案

---

## 📝 License

MIT
