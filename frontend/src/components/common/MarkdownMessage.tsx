import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, className = '' }) => {
  const [copiedBlock, setCopiedBlock] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedBlock(idx);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  // Split content by code blocks: ```lang ... ```
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className={`space-y-3 leading-relaxed text-xs text-[#0F172A] break-words ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract code and language
          const lines = part.slice(3, -3).split('\n');
          const lang = lines[0].trim() || 'code';
          const code = (lines.slice(1).join('\n') || lines.join('\n')).trim();

          return (
            <div key={index} className="my-2.5 rounded-lg overflow-hidden border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#F1F5F9] border-b border-[#E2E8F0] text-[10px] text-[#64748B] font-mono">
                <span className="font-semibold">{lang}</span>
                <button
                  onClick={() => handleCopyCode(code, index)}
                  className="flex items-center space-x-1 text-[#64748B] hover:text-[#0F172A] transition-colors py-0.5 px-1.5 rounded touch-manipulation"
                  title="Copy code"
                >
                  {copiedBlock === index ? (
                    <>
                      <Check className="w-3 h-3 text-[#166534]" />
                      <span className="text-[#166534] font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 text-[11px] font-mono overflow-x-auto whitespace-pre leading-normal text-[#0F172A] bg-[#F8FAFC] scrollbar-thin">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Parse regular paragraphs, bullet points, headers, tables
        return <FormattedBlock key={index} text={part} />;
      })}
    </div>
  );
};

const FormattedBlock: React.FC<{ text: string }> = ({ text }) => {
  const paragraphs = text.split(/\n\n+/);

  return (
    <>
      {paragraphs.map((para, pIdx) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        // Check if paragraph is a table (lines starting and ending with |)
        const lines = trimmed.split('\n');
        if (lines.length >= 2 && lines.every(l => l.trim().startsWith('|') && l.trim().endsWith('|'))) {
          return <TableBlock key={pIdx} lines={lines} />;
        }

        // Check if list
        if (lines.every(l => l.trim().startsWith('•') || l.trim().startsWith('- ') || l.trim().startsWith('* ') || /^\d+\.\s/.test(l.trim()))) {
          return (
            <ul key={pIdx} className="space-y-1.5 my-1.5 pl-1">
              {lines.map((item, i) => {
                const cleanItem = item.trim().replace(/^([•\-*]|\d+\.)\s*/, '');
                return (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 flex-shrink-0" />
                    <span className="break-words"><InlineText text={cleanItem} /></span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Header Check
        if (trimmed.startsWith('### ')) {
          return <h4 key={pIdx} className="text-xs font-bold text-[#0F172A] mt-2.5 mb-1"><InlineText text={trimmed.slice(4)} /></h4>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={pIdx} className="text-sm font-bold text-[#0F172A] mt-3 mb-1"><InlineText text={trimmed.slice(3)} /></h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={pIdx} className="text-base font-bold text-[#0F172A] mt-3.5 mb-1.5"><InlineText text={trimmed.slice(2)} /></h2>;
        }

        // Normal paragraph with line breaks
        return (
          <p key={pIdx} className="leading-relaxed break-words">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                <InlineText text={line} />
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
};

const InlineText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-[#0F172A]">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#2563EB] font-mono text-[10px] border border-[#CBD5E1]">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={i} className="italic text-[#64748B]">{part.slice(1, -1)}</em>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
};

const TableBlock: React.FC<{ lines: string[] }> = ({ lines }) => {
  const contentLines = lines.filter(l => !l.includes('---'));
  if (contentLines.length === 0) return null;

  const headerCells = contentLines[0].split('|').slice(1, -1).map(c => c.trim());
  const bodyRows = contentLines.slice(1).map(r => r.split('|').slice(1, -1).map(c => c.trim()));

  return (
    <div className="my-2.5 overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white scrollbar-thin">
      <table className="w-full text-left text-[11px] min-w-[320px]">
        <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#0F172A]">
          <tr>
            {headerCells.map((h, i) => (
              <th key={i} className="px-3 py-2 whitespace-nowrap"><InlineText text={h} /></th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {bodyRows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-[#F8FAFC] transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-1.5 text-[#475569] whitespace-nowrap"><InlineText text={cell} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
