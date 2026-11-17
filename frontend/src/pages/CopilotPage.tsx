import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  Loader2, 
  Trash2, 
  Download, 
  FileText,
  Bot,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  BarChart2,
  User
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

  const starterSuggestions = [
    { label: 'Summarize Key Statistics', icon: BarChart2, prompt: 'Provide a comprehensive statistical summary of this dataset.' },
    { label: 'Detect Anomaly Signals', icon: AlertTriangle, prompt: 'Are there any outliers, missing values, or anomalies in this data?' },
    { label: 'Explore Strong Correlations', icon: TrendingUp, prompt: 'What are the strongest relationships and correlations between variables?' },
    { label: 'Generate PDF Report', icon: FileText, prompt: 'Generate an executive PDF analysis report with visualizations.' },
  ];

  return (
    <div className="h-[calc(100vh-6.5rem)] sm:h-[calc(100vh-7rem)] flex flex-col rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden font-sans min-w-0 shadow-xs">
      {/* Header */}
      <div className="h-14 border-b border-[#E2E8F0] px-3 sm:px-5 flex items-center justify-between bg-white z-10 min-w-0 gap-2">
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-[#0F172A] whitespace-nowrap">Aether AI Copilot</h1>
              <p className="text-[10px] text-[#64748B] flex items-center space-x-1">
                <span className="pulse-dot-green" />
                <span>Context-Aware Analytics</span>
              </p>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Selected dataset */}
          <div className="flex items-center space-x-1.5 text-xs text-[#64748B] min-w-0">
            <span className="hidden sm:inline whitespace-nowrap font-medium text-slate-500">Dataset:</span>
            {datasets.length > 0 ? (
              <select
                value={activeDataset ? activeDataset.id : ''}
                onChange={(e) => {
                  const ds = datasets.find(d => d.id === e.target.value);
                  if (ds) selectDataset(ds);
                }}
                className="bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] max-w-[130px] sm:max-w-[220px] truncate touch-manipulation min-h-[32px] shadow-2xs"
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
            className="text-xs text-[#64748B] hover:text-red-600 flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors touch-manipulation flex-shrink-0 min-h-[34px]"
            title="Clear Chat History"
            aria-label="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-medium">Clear</span>
          </button>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-4 bg-[#F8FAFC] min-w-0 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center mb-3 shadow-xs">
              <Bot className="w-7 h-7" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">How can Aether Copilot assist you?</h2>
            <p className="text-xs text-[#64748B] mt-1 mb-6 leading-relaxed">
              Inquire about statistical distributions, bivariate relationships, anomaly detections, or request an automated PDF briefing.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
              {starterSuggestions.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(s.prompt)}
                    className="p-3 rounded-xl bg-white hover:bg-blue-50/70 border border-[#E2E8F0] hover:border-blue-200 text-xs font-semibold text-slate-800 transition-all shadow-2xs hover:shadow-xs flex items-center space-x-2.5 group cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="truncate">{s.label}</span>
                  </button>
                );
              })}
            </div>
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
              <div key={idx} className={`flex items-start space-x-2.5 ${isUser ? 'justify-end' : 'justify-start'} min-w-0`}>
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`rounded-2xl p-3.5 sm:p-4 text-xs min-w-0 max-w-[95%] sm:max-w-2xl break-words ${
                  isUser 
                    ? 'bg-[#1E293B] text-white shadow-xs' 
                    : 'bg-white border border-[#E2E8F0] text-[#0F172A] w-full shadow-xs'
                }`}>
                  {isUser ? (
                    <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                  ) : (
                    <MarkdownMessage content={m.content} />
                  )}

                  {/* Inline Chart */}
                  {!isUser && plotlyData && plotlyData.data && plotlyData.data.length > 0 && (
                    <div className="mt-3.5 rounded-xl border border-[#E2E8F0] bg-white p-2 min-w-0 overflow-hidden shadow-2xs">
                      <PlotlyChart
                        data={plotlyData.data}
                        layout={{
                          ...plotlyData.layout,
                          height: 270,
                          margin: { t: 25, r: 20, l: 40, b: 35 },
                        }}
                      />
                    </div>
                  )}

                  {/* Inline Report Link */}
                  {!isUser && reportPayload && (
                    <div className="mt-3 p-3 rounded-xl border border-blue-200 bg-blue-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center space-x-2 min-w-0">
                        <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="font-semibold text-xs text-[#0F172A] truncate">{reportPayload.title || 'Executive Report Generated'}</span>
                      </div>
                      <Link
                        to="/reports"
                        className="text-xs font-bold text-blue-700 hover:text-blue-900 touch-manipulation whitespace-nowrap py-1"
                      >
                        View in Reports Studio →
                      </Link>
                    </div>
                  )}

                  {/* PDF Download Action */}
                  {!isUser && (pdfPayload || downloadUrl) && (
                    <div className="mt-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 min-w-0">
                      <span className="text-xs font-semibold text-emerald-900 truncate" title={pdfPayload?.filename || 'analysis_report.pdf'}>
                        {pdfPayload?.filename || 'analysis_report.pdf'}
                      </span>
                      <button
                        onClick={() => handleDownloadPdf(pdfPayload?.dataset_id || (activeDataset ? activeDataset.id : undefined))}
                        disabled={downloadingReport}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors flex items-center justify-center space-x-1.5 touch-manipulation min-h-[36px]"
                      >
                        {downloadingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        <span>Download Executive PDF</span>
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isSending && (
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="rounded-2xl p-3 text-xs bg-white border border-[#E2E8F0] text-[#64748B] flex items-center space-x-2 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
              <span className="font-medium">Evaluating statistical distribution & evidence...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Field & Send Action */}
      <div className="p-3 sm:p-4 border-t border-[#E2E8F0] bg-white min-w-0">
        <div className="flex items-center space-x-2 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            disabled={isSending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={activeDataset ? `Ask Aether Copilot about ${activeDataset.original_filename}...` : "Select a dataset or ask a general query..."}
            className="flex-1 bg-slate-50 hover:bg-white focus:bg-white border border-[#CBD5E1] rounded-xl px-4 py-2.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] transition-all min-w-0 shadow-2xs"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isSending}
            className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-semibold transition-all hover:shadow-xs flex items-center space-x-1.5 touch-manipulation flex-shrink-0 min-h-[40px]"
            aria-label="Send message"
          >
            <span className="hidden sm:inline">Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
          <span>Press Enter to send</span>
          <span>Powered by Aether Fast Analytics Kernel</span>
        </div>
      </div>
    </div>
  );
};