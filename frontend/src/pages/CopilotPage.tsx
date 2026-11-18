import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  Trash2, 
  Download, 
  FileText,
  Bot,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  BarChart2,
  User,
  Square
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { PlotlyChart } from '../components/common/PlotlyChart';
import { chartPayloadToPlotly } from '../utils/chartPayloadToPlotly';
import { MarkdownMessage } from '../components/common/MarkdownMessage';
import { 
  PageTransition,
  AetherSignal,
  CopilotWelcomeIllustration,
  InteractiveButton
} from '../components/motion';

interface ChatMessage {
  id?: string;
  sender: 'user' | 'bot';
  content: string;
  evidence?: Record<string, any>;
  created_at?: string;
  isStreaming?: boolean;
}

const THINKING_STEPS = [
  'Inspecting dataset schema & metadata...',
  'Evaluating statistical distributions & correlations...',
  'Formulating analytical synthesis & evidence...'
];

export const CopilotPage: React.FC = () => {
  const { activeDataset, datasets, selectDataset } = useWorkspaceStore();
  const location = useLocation();

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isUserScrolledUp = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Cycle thinking steps while isSending
  useEffect(() => {
    if (!isSending) {
      setThinkingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setThinkingStep((prev) => (prev + 1) % THINKING_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isSending]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Track if user scrolled up
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // If distance from bottom is > 80px, user has scrolled up
    isUserScrolledUp.current = scrollHeight - scrollTop - clientHeight > 80;
  };

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
            created_at: m.created_at,
            isStreaming: false
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

  // Stop Generation handler
  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
    setIsSending(false);
  }, []);

  // Send message handler with real-time SSE streaming
  const handleSendMessage = useCallback(async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : input).trim();
    if (!text || isSending) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userMsg: ChatMessage = { 
      id: 'user-' + Date.now(),
      sender: 'user', 
      content: text,
      created_at: new Date().toISOString()
    };

    const tempBotId = 'bot-stream-' + Date.now();
    const placeholderBotMsg: ChatMessage = {
      id: tempBotId,
      sender: 'bot',
      content: '',
      evidence: undefined,
      isStreaming: true,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg, placeholderBotMsg]);
    setInput('');
    setIsSending(true);
    isUserScrolledUp.current = false;

    try {
      await api.streamCopilotChat(
        {
          message: text,
          dataset_id: activeDataset ? activeDataset.id : null,
          conversation_id: activeConvId
        },
        {
          onMetadata: (meta) => {
            if (meta.conversation_id && meta.conversation_id !== activeConvId) {
              setActiveConvId(meta.conversation_id);
            }
            if (meta.evidence) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempBotId ? { ...m, evidence: meta.evidence } : m
                )
              );
            }
          },
          onDelta: (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempBotId ? { ...m, content: m.content + chunk } : m
              )
            );
          },
          onDone: (data) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempBotId
                  ? {
                      ...m,
                      id: data.id || m.id,
                      content: data.content || m.content,
                      evidence: data.evidence || m.evidence,
                      isStreaming: false
                    }
                  : m
              )
            );
            if (data.conversation_id && data.conversation_id !== activeConvId) {
              setActiveConvId(data.conversation_id);
            }
            setIsSending(false);
            abortControllerRef.current = null;
          },
          onError: (err) => {
            if (abortController.signal.aborted) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempBotId ? { ...m, isStreaming: false } : m
                )
              );
            } else {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempBotId
                    ? {
                        ...m,
                        content: m.content
                          ? m.content + `\n\n*(Generation interrupted: ${err.message})*`
                          : `Error: ${err.message || 'Unable to process request. Please try again.'}`,
                        isStreaming: false
                      }
                    : m
                )
              );
            }
            setIsSending(false);
            abortControllerRef.current = null;
          }
        },
        abortController.signal
      );
    } catch (err: any) {
      if (!abortController.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempBotId
              ? {
                  ...m,
                  content: `Error: ${err.message || 'Unable to process request. Please try again.'}`,
                  isStreaming: false
                }
              : m
          )
        );
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
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

  // Scroll to bottom only if user hasn't scrolled up
  useEffect(() => {
    if (!isUserScrolledUp.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
    <PageTransition className="h-[calc(100vh-6.5rem)] sm:h-[calc(100vh-7rem)] flex flex-col rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden font-sans min-w-0 shadow-xs">
      {/* Header */}
      <div className="h-16 border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between bg-white z-10 min-w-0 gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="flex items-center space-x-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shadow-2xs">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-[#0F172A] whitespace-nowrap">Aether AI Copilot</h1>
              <p className="text-xs text-[#64748B] flex items-center space-x-1.5">
                <AetherSignal status="idle" size="sm" />
                <span>Context-Aware Analytics</span>
              </p>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Selected dataset */}
          <div className="flex items-center space-x-2 text-xs sm:text-sm text-[#64748B] min-w-0">
            <span className="hidden sm:inline whitespace-nowrap font-medium text-slate-500">Dataset:</span>
            {datasets.length > 0 ? (
              <select
                value={activeDataset ? activeDataset.id : ''}
                onChange={(e) => {
                  const ds = datasets.find(d => d.id === e.target.value);
                  if (ds) selectDataset(ds);
                }}
                className="bg-white border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] max-w-[140px] sm:max-w-[240px] truncate touch-manipulation min-h-[38px] shadow-2xs"
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
          <InteractiveButton
            onClick={handleClear}
            className="text-xs sm:text-sm text-[#64748B] hover:text-red-600 flex items-center space-x-1.5 px-3 py-2 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors touch-manipulation flex-shrink-0 min-h-[38px]"
            aria-label="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Clear</span>
          </InteractiveButton>
        )}
      </div>

      {/* Chat Area */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 p-4 sm:p-7 overflow-y-auto space-y-5 bg-[#F8FAFC] min-w-0 scrollbar-thin"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 max-w-xl mx-auto">
            <CopilotWelcomeIllustration className="mb-4" />
            <h2 className="text-lg sm:text-xl font-bold text-[#0F172A]">How can Aether Copilot assist you?</h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1.5 mb-7 leading-relaxed max-w-md">
              Inquire about statistical distributions, bivariate relationships, anomaly detections, or request an automated PDF briefing.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
              {starterSuggestions.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <motion.button
                    key={idx}
                    whileHover={{ y: -1, boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSendMessage(s.prompt)}
                    className="p-3.5 sm:p-4 rounded-xl bg-white hover:bg-blue-50/70 border border-[#E2E8F0] hover:border-blue-200 text-xs sm:text-sm font-semibold text-slate-800 transition-colors shadow-2xs flex items-center space-x-3 group cursor-pointer text-left min-h-[52px]"
                  >
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform flex-shrink-0">
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span className="truncate">{s.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <AnimatePresence initial={false}>
              {messages.map((m, idx) => {
                const isUser = m.sender === 'user';
                const chartPayload = m.evidence?.chart;
                const reportPayload = m.evidence?.report;
                const pdfPayload = m.evidence?.pdf;
                const downloadUrl = m.evidence?.download_url || pdfPayload?.download_url;
                const plotlyData = chartPayload ? chartPayloadToPlotly(chartPayload) : null;

                return (
                  <motion.div 
                    key={m.id || `msg-${idx}`}
                    initial={{ opacity: 0, x: isUser ? 14 : -14, y: 4 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex items-start space-x-3 ${isUser ? 'justify-end' : 'justify-start'} min-w-0`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                        <Bot className="w-4.5 h-4.5" />
                      </div>
                    )}

                    <div className={`rounded-2xl p-4 sm:p-5 text-sm sm:text-[0.95rem] min-w-0 max-w-[95%] sm:max-w-2xl break-words ${
                      isUser 
                        ? 'bg-[#1E293B] text-white shadow-xs' 
                        : 'bg-white border border-[#E2E8F0] text-[#0F172A] w-full shadow-xs'
                    }`}>
                      {isUser ? (
                        <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                      ) : m.isStreaming && !m.content ? (
                        <div className="flex items-center space-x-2.5 py-1 text-slate-500 text-xs sm:text-sm">
                          <AetherSignal status="processing" size="sm" />
                          <span className="font-medium animate-pulse">
                            {THINKING_STEPS[thinkingStep]}
                          </span>
                        </div>
                      ) : (
                        <MarkdownMessage content={m.content} isStreaming={m.isStreaming} />
                      )}

                      {/* Inline Chart with Progressive Reveal */}
                      {!isUser && plotlyData && plotlyData.data && plotlyData.data.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1, duration: 0.25 }}
                          className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-2.5 min-w-0 overflow-hidden shadow-2xs"
                        >
                          <PlotlyChart
                            data={plotlyData.data}
                            layout={{
                              ...plotlyData.layout,
                              height: 310,
                              margin: { t: 25, r: 20, l: 40, b: 35 },
                            }}
                          />
                        </motion.div>
                      )}

                      {/* Inline Report Link */}
                      {!isUser && reportPayload && (
                        <motion.div 
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15, duration: 0.2 }}
                          className="mt-3.5 p-3.5 sm:p-4 rounded-xl border border-blue-200 bg-blue-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 min-w-0"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <FileText className="w-4.5 h-4.5 text-blue-600 flex-shrink-0" />
                            <span className="font-semibold text-xs sm:text-sm text-[#0F172A] truncate">{reportPayload.title || 'Executive Report Generated'}</span>
                          </div>
                          <Link
                            to="/reports"
                            className="text-xs sm:text-sm font-bold text-blue-700 hover:text-blue-900 touch-manipulation whitespace-nowrap py-1"
                          >
                            View in Reports Studio →
                          </Link>
                        </motion.div>
                      )}

                      {/* PDF Download Action */}
                      {!isUser && (pdfPayload || downloadUrl) && (
                        <motion.div 
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.18, duration: 0.2 }}
                          className="mt-3.5 p-3.5 sm:p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 min-w-0"
                        >
                          <span className="text-xs sm:text-sm font-semibold text-emerald-900 truncate" title={pdfPayload?.filename || 'analysis_report.pdf'}>
                            {pdfPayload?.filename || 'analysis_report.pdf'}
                          </span>
                          <InteractiveButton
                            onClick={() => handleDownloadPdf(pdfPayload?.dataset_id || (activeDataset ? activeDataset.id : undefined))}
                            disabled={downloadingReport}
                            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center space-x-2 touch-manipulation min-h-[42px]"
                          >
                            {downloadingReport ? (
                              <AetherSignal status="processing" size="sm" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            <span>Download Executive PDF</span>
                          </InteractiveButton>
                        </motion.div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-4.5 h-4.5" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Field & Send Action */}
      <div className="p-3.5 sm:p-5 border-t border-[#E2E8F0] bg-white min-w-0">
        <div className="flex items-center space-x-2.5 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            disabled={isSending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={activeDataset ? `Ask Aether Copilot about ${activeDataset.original_filename}...` : "Select a dataset or ask a general query..."}
            className="flex-1 bg-slate-50 hover:bg-white focus:bg-white border border-[#CBD5E1] rounded-xl px-4.5 py-3 text-sm sm:text-base text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] transition-all min-w-0 min-h-[48px] sm:min-h-[52px] shadow-2xs"
          />
          {isSending ? (
            <InteractiveButton
              onClick={handleStopGeneration}
              className="px-4 sm:px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm sm:text-base font-semibold transition-all hover:shadow-xs flex items-center space-x-2 touch-manipulation flex-shrink-0 min-h-[48px] sm:min-h-[52px]"
              aria-label="Stop generation"
            >
              <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
              <span className="hidden sm:inline">Stop</span>
            </InteractiveButton>
          ) : (
            <InteractiveButton
              onClick={() => handleSendMessage()}
              disabled={!input.trim()}
              className="px-5 sm:px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-sm sm:text-base font-semibold transition-all hover:shadow-xs flex items-center space-x-2 touch-manipulation flex-shrink-0 min-h-[48px] sm:min-h-[52px]"
              aria-label="Send message"
            >
              <span className="hidden sm:inline">Send</span>
              <Send className="w-4 h-4" />
            </InteractiveButton>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Press Enter to send</span>
          <span>Powered by Aether Fast Analytics Kernel</span>
        </div>
      </div>
    </PageTransition>
  );
};
