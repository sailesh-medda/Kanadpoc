import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// If you expect trusted inline HTML inside your markdown, you can add rehype-raw too:
// import rehypeRaw from "rehype-raw";

function normalizeContent(input = "") {
  return input
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("\r\n", "\n")
    .trim();
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function downloadAsFile(filename, text) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

export default function ResultCard({ title, content }) {
  const [collapsed, setCollapsed] = useState(false);
  const normalized = useMemo(() => normalizeContent(content), [content]);

  return (
    <motion.div
      className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur shadow-sm p-5 md:p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const ok = await copyToClipboard(normalized);
              if (ok) console.info("Copied");
            }}
            className="text-xs md:text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 active:bg-gray-100"
            title="Copy to clipboard"
          >
            Copy
          </button>
          <button
            onClick={() => downloadAsFile(`${title.replace(/\s+/g, "_")}.md`, normalized)}
            className="text-xs md:text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 active:bg-gray-100"
            title="Download as .md"
          >
            Download
          </button>
          <button
            onClick={() => setCollapsed(v => !v)}
            className="text-xs md:text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 active:bg-gray-100"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-4 overflow-auto">
          <div className="prose prose-sm md:prose-base max-w-none prose-headings:scroll-mt-20 prose-h2:mt-3 prose-h3:mt-3 prose-p:my-2 prose-li:my-0.5 prose-table:my-3 prose-th:text-gray-700 prose-td:text-gray-800">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              // rehypePlugins={[rehypeRaw]} // enable only if you must render trusted inline HTML
              components={{
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto">
                    <table className="min-w-[560px] table-auto border-collapse" {...props} />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th className="border border-gray-300 bg-gray-50 px-3 py-1.5 text-left text-sm font-medium" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="border border-gray-200 px-3 py-1.5 align-top text-sm" {...props} />
                ),
                h1: ({ node, ...props }) => <h2 {...props} />, // optional downscale
              }}
            >
              {normalized}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </motion.div>
  );
}