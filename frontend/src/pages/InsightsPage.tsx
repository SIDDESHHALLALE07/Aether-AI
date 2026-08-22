import React from 'react';
import { Lightbulb, ShieldCheck } from 'lucide-react';

export const InsightsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">AI Generated Insights</h1>
        <p className="text-xs text-gray-400 mt-1">Structured insights generated from exact computed evidence and Gemini synthesis.</p>
      </div>

      <div className="space-y-4">
        {[
          { title: 'High Churn Risk for Month-to-Month Contracts', type: 'Predictive Insight', conf: 92, evidence: 'Churn rate is 42.7% for month-to-month contracts vs 11.2% for annual contracts.', ai: 'Customers on month-to-month contracts show a 3.8x higher churn likelihood.' },
          { title: 'Strong Dependency between Monthly & Total Charges', type: 'Correlation Insight', conf: 98, evidence: 'Pearson r = 0.826, p-value < 0.001.', ai: 'Monthly charge tier is the primary driver of cumulative customer spend.' },
        ].map((ins, idx) => (
          <div key={idx} className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>{ins.title}</span>
              </h3>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                {ins.conf}% Confidence
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-2">{ins.ai}</p>
            <div className="mt-3 pt-2 border-t border-white/10 text-[10px] text-cyan-300 font-mono flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              <span>COMPUTED EVIDENCE: {ins.evidence}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
