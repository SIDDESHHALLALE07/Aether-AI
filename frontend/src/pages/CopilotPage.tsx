import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  Loader2, 
  Trash2, 
  Download, 
  FileText,
  Bot
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { useLocation, Link } from 'react-router-dom';
import { api } from '../services/api';
import { PlotlyChart } from '../components/common/PlotlyChart';
import { chartPayloadToPlotly } from '../utils/chartPayloadToPlotly';
import { MarkdownMessage } from '../components/common/MarkdownMessage';

interface ChatMessage {
  id?: string;
  sender: 'user' | 'bot';
  content: string;
  evidence?: Record<string, any>;
  created_at?: string;
}

export const CopilotPage: React.FC = () => {
  const { activeDataset, datasets, selectDataset } = useWorkspaceStore();
  const location = useLocation();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Load dataset history
  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      if (!activeDataset) {
        setMessages([]);
        return;
      }
      try {
        const hist = await api.getCopilotHistory(activeDataset.id);
        if (isMounted && hist && hist.messages && hist.messages.length > 0) {
          setMessages(hist.messages.map(m => ({
            id: m.id,
            sender: m.sender,
            content: m.content,
            evidence: m.evidence,
            created_at: m.created_at
          })));
          if (hist.id && hist.id !== 'new-conv') {
            setActiveConvId(hist.id);
          }
        } else if (isMounted) {
          setMessages([]);
        }
      } catch {
        if (isMounted) setMessages([]);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [activeDataset]);

  // Send message handler
  const handleSendMessage = useCallback(async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : input).trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = { sender: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const botResponse = await api.sendCopilotChat({
        message: text,
        dataset_id: activeDataset ? activeDataset.id : null,
        conversation_id: activeConvId
      });

      const botMsg: ChatMessage = {
        id: botResponse.id,
        sender: 'bot',
        content: botResponse.content,
        evidence: botResponse.evidence,
        created_at: botResponse.created_at
      };

      setMessages((prev) => [...prev, botMsg]);
      if (botResponse.conversation_id && botResponse.conversation_id !== activeConvId) {
        setActiveConvId(botResponse.conversation_id);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        sender: 'bot',
        content: `Error: ${err.message || 'Unable to process request. Please try again.'}`
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [activeDataset, activeConvId, input, isSending]);

  // Handle location state initial prompt if routed from elsewhere
  useEffect(() => {
    if (location.state && (location.state as any).initialPrompt) {
      const prompt = (location.state as any).initialPrompt;
      const timer = setTimeout(() => { handleSendMessage(prompt); }, 100);
      window.history.replaceState({}, document.title);
      return () => clearTimeout(timer);
    }
  }, [location.state, handleSendMessage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Clear history
  const handleClear = async () => {
    if (activeDataset) {
      try {
        await api.clearCopilotHistory(activeDataset.id);
        setMessages([]);
      } catch {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  };

  // Download PDF report
  const handleDownloadPdf = async (datasetId?: string) => {
    const dsId = datasetId || (activeDataset ? activeDataset.id : null);
    if (!dsId) return;
    setDownloadingReport(true);
    try {
      await api.downloadPdfReportBlob(dsId);
    } catch (err) {
      console.error('Download PDF failed:', err);
    } finally {
      setDownloadingReport(false);
    }
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] sm:h-[calc(100vh-7rem)] flex flex-col rounded-xl border border-[#E2E8F0] bg-white overflow-hidden font-sans min-w-0">
      {/* Header */}
      <div className="h-14 border-b border-[#E2E8F0] px-3 sm:px-5 flex items-center justify-between bg-white z-10 min-w-0 gap-2">
        <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <Bot className="w-4 h-4 text-[#2563EB]" />
            <h1 className="text-xs sm:text-sm font-semibold text-[#0F172A] whitespace-nowrap">Aether AI</h1>
          </div>

          {/* Selected dataset */}
          <div className="flex items-center space-x-1.5 text-xs text-[#64748B] min-w-0">
            <span className="hidden sm:inline whitespace-nowrap">Dataset:</span>
            {datasets.length > 0 ? (
              <select
                value={activeDataset ? activeDataset.id : ''}
                onChange={(e) => {
                  const ds = datasets.find(d => d.id === e.target.value);
                  if (ds) selectDataset(ds);
                }}
                className="bg-white border border-[#CBD5E1] rounded-md px-2 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] max-w-[100px] min-[360px]:max-w-[130px] sm:max-w-[200px] truncate touch-manipulation min-h-[34px]"
              >
                {!activeDataset && <option value="">Select dataset...</option>}
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.original_filename} (v{d.current_version_num})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[#94A3B8]">None</span>
            )}
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-[#64748B] hover:text-[#DC2626] flex items-center space-x-1 px-2.5 py-1.5 rounded hover:bg-[#F8FAFC] transition-colors touch-manipulation flex-shrink-0 min-h-[36px]"
            title="Clear Chat"
            aria-label="Clear Chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-3.5 bg-[#F8FAFC] min-w-0 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-10 h-10 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mb-2.5">
              <Bot className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-semibold text-[#0F172A]">Aether AI Copilot</h2>
            <p className="text-xs text-[#64748B] mt-1 max-w-sm">
              Ask any question to generate statistical summaries, charts, anomaly analyses, or executive reports.
            </p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isUser = m.sender === 'user';
            const chartPayload = m.evidence?.chart;
            const reportPayload = m.evidence?.report;
            const pdfPayload = m.evidence?.pdf;
            const downloadUrl = m.evidence?.download_url || pdfPayload?.download_url;
            const plotlyData = chartPayload ? chartPayloadToPlotly(chartPayload) : null;

            return (
              <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} min-w-0`}>
                <div className={`rounded-xl p-3 sm:p-4 text-xs min-w-0 max-w-[95%] sm:max-w-2xl break-words ${
                  isUser 
                    ? 'bg-[#1E293B] text-white' 
                    : 'bg-white border border-[#E2E8F0] text-[#0F172A] w-full shadow-xs'
                }`}>
                  {isUser ? (
                    <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                  ) : (
                    <MarkdownMessage content={m.content} />
                  )}

                  {/* Inline Chart */}
                  {!isUser && plotlyData && plotlyData.data && plotlyData.data.length > 0 && (
                    <div className="mt-3 rounded-lg border border-[#E2E8F0] bg-white p-2 min-w-0 overflow-hidden">
                      <PlotlyChart
                        data={plotlyData.data}
                        layout={{
                          ...plotlyData.layout,
                          height: 260,
                        }}
                      />
                    </div>
                  )}

                  {/* Inline Report Link */}
                  {!isUser && reportPayload && (
                    <div className="mt-3 p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center space-x-2 min-w-0">
                        <FileText className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
                        <span className="font-medium text-xs text-[#0F172A] truncate">{reportPayload.title || 'Report Generated'}</span>
                      </div>
                      <Link
                        to="/reports"
                        className="text-xs font-medium text-[#2563EB] hover:underline touch-manipulation whitespace-nowrap py-1"
                      >
                        View in Reports →
                      </Link>
                    </div>
                  )}

                  {/* PDF Download Action */}
                  {!isUser && (pdfPayload || downloadUrl) && (
                    <div className="mt-3 p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 min-w-0">
                      <span className="text-xs font-medium text-[#0F172A] truncate" title={pdfPayload?.filename || 'analysis_report.pdf'}>
                        {pdfPayload?.filename || 'analysis_report.pdf'}
                      </span>
                      <button
                        onClick={() => handleDownloadPdf(pdfPayload?.dataset_id || (activeDataset ? activeDataset.id : undefined))}
                        disabled={downloadingReport}
                        className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-medium px-3.5 py-2 rounded-md transition-colors flex items-center justify-center space-x-1.5 touch-manipulation min-h-[38px]"
                      >
                        {downloadingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        <span>Download PDF</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {isSending && (
          <div className="flex justify-start min-w-0">
            <div className="rounded-xl p-3 text-xs bg-white border border-[#E2E8F0] text-[#64748B] flex items-center space-x-2 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
              <span>Analyzing dataset evidence...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Field & Send Action */}
      <div className="p-2.5 sm:p-3.5 border-t border-[#E2E8F0] bg-white min-w-0">
        <div className="flex items-center space-x-2 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            disabled={isSending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={activeDataset ? "Ask about this dataset..." : "Select a dataset or ask a general query..."}
            className="flex-1 bg-white border border-[#CBD5E1] rounded-lg px-3.5 py-2.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] min-w-0"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isSending}
            className="px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-medium transition-colors flex items-center space-x-1.5 touch-manipulation flex-shrink-0 min-h-[42px]"
            aria-label="Send message"
          >
            <span className="hidden sm:inline">Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
