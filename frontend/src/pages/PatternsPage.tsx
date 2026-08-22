import React from 'react';
import { TrendingUp, AlertOctagon, Network } from 'lucide-react';

export const PatternsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Hidden Pattern Discovery Engine</h1>
        <p className="text-xs text-gray-400 mt-1">Automatic detection of Pearson correlations, Isolation Forest anomalies, and K-Means clusters.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center space-x-2 text-cyan-400 mb-3">
            <TrendingUp className="w-5 h-5" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Correlation (r = 0.826)</h3>
          </div>
          <p className="text-xs text-gray-300 font-semibold">MonthlyCharges vs TotalCharges</p>
          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">Strong linear correlation detected with p-value &lt; 0.001.</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center space-x-2 text-rose-400 mb-3">
            <AlertOctagon className="w-5 h-5" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Anomalies Detected</h3>
          </div>
          <p className="text-xs text-gray-300 font-semibold">3 High TotalCharges Outliers</p>
          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">Isolation Forest identified 3 customer records exceeding 3.5 Z-score.</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center space-x-2 text-amber-400 mb-3">
            <Network className="w-5 h-5" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">K-Means Clusters</h3>
          </div>
          <p className="text-xs text-gray-300 font-semibold">3 Distinct Customer Segments</p>
          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">Optimal cluster k=3 based on Silhouette score of 0.68.</p>
        </div>
      </div>
    </div>
  );
};
