// ===== PDF 导出 =====
// 用 html2canvas 把结果区域的 DOM 截成图片，
// 再用 jsPDF 把图片放进 PDF 文件，最后触发下载
//
// 为什么用截图而不是直接写 PDF：
// jsPDF 原生不支持中文字体，需要额外嵌入字体文件（复杂）。
// 用 html2canvas 截图可以完美保留页面上的中文和样式。
//
// 为什么要修补颜色（oklch → rgb）：
// Tailwind CSS v4 所有颜色默认用 oklch() 格式，
// 而 html2canvas 的 CSS 解析器不认识 oklch/lab 这些新颜色函数。
// 解决方案分两步：
//   1. 截图前，用 getComputedStyle（浏览器会返回算好的 rgb 值）
//      把元素所有样式写成 inline style
//   2. 在 html2canvas 的 onclone 回调里删掉所有 <style> 标签，
//      这样它只能读到 inline style 里的 rgb 颜色，不会崩

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * 把元素树所有计算后的样式写成 inline style
 * 并返回「恢复函数」，调用后还原所有元素
 */
function inlineAllComputedStyles(root: HTMLElement): () => void {
  const allElements = [root, ...Array.from(root.querySelectorAll("*"))];

  // 备份每个元素的原始 inline style
  const backups: Array<{ el: HTMLElement; cssText: string }> = [];
  for (const el of allElements) {
    const htmlEl = el as HTMLElement;
    backups.push({ el: htmlEl, cssText: htmlEl.style.cssText });
  }

  // 用 getComputedStyle 的 rgb 值覆盖 inline style
  // 关键：浏览器 getComputedStyle 对普通属性返回 rgb/rgba，
  // 但 CSS 自定义属性（--tw-*）保持原始 oklch()，必须跳过
  for (const el of allElements) {
    const htmlEl = el as HTMLElement;
    const computed = window.getComputedStyle(htmlEl);

    const parts: string[] = [];
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      // CSS 自定义属性（--开头）不会被浏览器解析颜色，值仍是 oklch()
      if (prop.startsWith("--")) continue;
      const value = computed.getPropertyValue(prop);
      // 兜底：万一还有漏网的，直接跳过
      if (value.includes("oklch(") || value.includes("lab(")) continue;
      parts.push(`${prop}:${value}`);
    }
    htmlEl.style.cssText = parts.join(";");
  }

  // 返回恢复函数
  return () => {
    for (const { el, cssText } of backups) {
      el.style.cssText = cssText;
    }
  };
}

/**
 * 将指定 DOM 元素导出为 A4 大小的 PDF
 * @param element - 要导出的 DOM 元素（通过 ref 获取）
 * @param filename - 下载文件名（不用带 .pdf 后缀）
 */
export async function downloadPdf(
  element: HTMLElement,
  filename?: string
): Promise<void> {
  // 0. 预处理：把所有样式写成 inline（此时浏览器已经算好了 rgb 值）
  const restore = inlineAllComputedStyles(element);

  try {
    // 1. 用 html2canvas 将 DOM 转成图片
    const canvas = await html2canvas(element, {
      scale: 2, // 2 倍分辨率，让图片更清晰
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      // 关键：在克隆的文档里删除所有 <style> 和 <link> 标签，
      // 这样 html2canvas 只能读到我们写好的 inline style（里面全是 rgb）
      onclone: (clonedDoc) => {
        clonedDoc
          .querySelectorAll("style, link[rel='stylesheet']")
          .forEach((el) => el.remove());
      },
    });

    // 2. 计算图片在 A4 纸上的尺寸
    const imgWidth = 210; // A4 宽度（mm）
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // 3. 创建 PDF（纵向 A4）
    const pdf = new jsPDF("p", "mm", "a4");

    // 4. 如果图片高度超过一页 A4（297mm），分页处理
    const pageHeight = 297;
    let heightLeft = imgHeight;
    let position = 0;

    // 第一页
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      position,
      imgWidth,
      imgHeight
    );
    heightLeft -= pageHeight;

    // 后续页
    while (heightLeft > 0) {
      position = -(imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        position,
        imgWidth,
        imgHeight
      );
      heightLeft -= pageHeight;
    }

    // 5. 触发下载
    const finalFilename =
      filename || `简历分析报告_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(finalFilename);
  } finally {
    // 6. 无论成功或失败，都要恢复原来的 DOM 样式
    restore();
  }
}
