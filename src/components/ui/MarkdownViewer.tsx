import React, { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";

interface CodeBlockProps {
  language: string;
  code: string;
}

export function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      style={{
        margin: "10px 0",
        borderRadius: "6px",
        overflow: "hidden",
        border: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-primary)",
        maxWidth: "100%",
        minWidth: 0,
      }}
    >
      {/* Code Header with language and copy button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 12px",
          backgroundColor: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-color)",
          fontSize: "0.72rem",
          fontFamily: "var(--font-mono, monospace)",
          color: "var(--text-dim)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px", textTransform: "uppercase", fontWeight: 600 }}>
          <Terminal size={12} color="var(--accent-cyan)" />
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "2px 8px",
            borderRadius: "4px",
            backgroundColor: copied ? "rgba(16, 185, 129, 0.15)" : "transparent",
            color: copied ? "var(--accent-emerald)" : "var(--text-muted)",
            border: "1px solid transparent",
            cursor: "pointer",
            fontSize: "0.72rem",
            fontWeight: 500,
            transition: "all 0.15s ease",
          }}
          title="Copy code to clipboard"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? "Copied" : "Copy Code"}</span>
        </button>
      </div>

      {/* Code content */}
      <pre
        style={{
          margin: 0,
          padding: "12px",
          fontSize: "0.82rem",
          fontFamily: "var(--font-mono, 'Fira Code', monospace)",
          lineHeight: "1.5",
          overflowX: "auto",
          maxWidth: "100%",
          color: "var(--text-main)",
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

interface MarkdownViewerProps {
  content: string;
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  if (!content) return null;

  // Split content into code blocks and markdown text segments
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push(renderTextSegment(textBefore, `txt-${lastIndex}`));
    }

    const language = match[1] || "text";
    const code = match[2]?.trimEnd() || "";
    parts.push(<CodeBlock key={`code-${match.index}`} language={language} code={code} />);

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText) {
    parts.push(renderTextSegment(remainingText, `txt-${lastIndex}`));
  }

  return (
    <div
      style={{
        wordBreak: "break-word",
        overflowWrap: "break-word",
        minWidth: 0,
        maxWidth: "100%",
      }}
    >
      {parts}
    </div>
  );
}

function renderTextSegment(text: string, keyPrefix: string) {
  const lines = text.split("\n");

  return (
    <div key={keyPrefix}>
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();

        // Headers
        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={`${keyPrefix}-h3-${lIdx}`}
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "var(--accent-cyan)",
                margin: "12px 0 6px 0",
              }}
            >
              {renderInlineStyles(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3
              key={`${keyPrefix}-h2-${lIdx}`}
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "var(--text-main)",
                margin: "14px 0 6px 0",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "4px",
              }}
            >
              {renderInlineStyles(trimmed.slice(3))}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2
              key={`${keyPrefix}-h1-${lIdx}`}
              style={{
                fontSize: "1.15rem",
                fontWeight: 700,
                color: "var(--text-main)",
                margin: "16px 0 8px 0",
              }}
            >
              {renderInlineStyles(trimmed.slice(2))}
            </h2>
          );
        }

        // Bullet lists
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div
              key={`${keyPrefix}-li-${lIdx}`}
              style={{
                display: "flex",
                gap: "8px",
                marginLeft: "8px",
                marginBottom: "4px",
              }}
            >
              <span style={{ color: "var(--accent-cyan)", userSelect: "none" }}>•</span>
              <span style={{ flex: 1 }}>{renderInlineStyles(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Empty lines create spacing
        if (!trimmed) {
          return <div key={`${keyPrefix}-empty-${lIdx}`} style={{ height: "8px" }} />;
        }

        // Regular paragraphs
        return (
          <p key={`${keyPrefix}-p-${lIdx}`} style={{ margin: "4px 0", lineHeight: "1.55" }}>
            {renderInlineStyles(line)}
          </p>
        );
      })}
    </div>
  );
}

function renderInlineStyles(text: string): React.ReactNode[] {
  // Regex to match inline code (`code`) and bold (**bold**)
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.substring(lastIdx, match.index));
    }

    const token = match[0];
    if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={`code-${match.index}`}
          style={{
            fontFamily: "var(--font-mono, monospace)",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            padding: "2px 5px",
            borderRadius: "4px",
            fontSize: "0.85em",
            color: "var(--accent-cyan)",
            border: "1px solid var(--border-color)",
            wordBreak: "break-all",
            overflowWrap: "anywhere",
            whiteSpace: "pre-wrap",
            maxWidth: "100%",
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`bold-${match.index}`} style={{ fontWeight: 700, color: "var(--text-main)" }}>
          {token.slice(2, -2)}
        </strong>
      );
    }

    lastIdx = match.index + token.length;
  }

  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }

  return parts;
}
