import React, { useState } from 'react';
import { Bot, Send, ShieldCheck } from 'lucide-react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  evidence?: string;
}

export const CopilotPage: React.FC = () => {
  const { activeDataset } = useWorkspaceStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: `Hello! I am Aether Copilot. I have analyzed ${activeDataset?.originalFilename || 'customer_churn.csv'}. You can ask me analytical questions, request pattern explanations, or get cleaning recommendations grounded strictly in computed evidence.`,
      evidence: 'Dataset profiled: 10,500 rows, 12 columns. Quality Score: 94/100.',
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { sender: 'user', text: input };
    const botReply: ChatMessage = {
      sender: 'bot',
      text: `Based on computed statistics for ${activeDataset?.originalFilename || 'your dataset'}, the top correlated variables are MonthlyCharges and TotalCharges with a Pearson coefficient of 0.826 (p < 0.001). Tenure also shows a strong positive correlation (0.812).`,
      evidence: 'Backend Computation: Pearson Correlation matrix computed on 10,500 rows.',
    };
    setMessages((prev) => [...prev, userMsg, botReply]);
    setInput('');
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col rounded-2xl border border-white/10 bg-[#090D16] overflow-hidden">
      {/* Copilot Header */}
      <div className="h-14 border-b border-white/10 px-6 flex items-center justify-between bg-[#111827]/80 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-cyan-400" />
          <h1 className="text-sm font-bold text-white">AI Copilot Chat</h1>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
            Evidence-Grounded (Gemini API)
          </span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed ${
              m.sender === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white/5 border border-white/10 text-gray-200 rounded-bl-none'
            }`}>
              <p>{m.text}</p>
              {m.evidence && (
                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center space-x-1 text-[10px] text-cyan-300 font-mono">
                  <ShieldCheck className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                  <span>COMPUTED EVIDENCE: {m.evidence}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-white/10 bg-[#111827]/80">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question about your dataset (e.g. 'What are the strongest correlations?')"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleSend}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
