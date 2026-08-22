import React from 'react';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Descriptive Analytics & Aggregations</h1>
        <p className="text-xs text-gray-400 mt-1">Backend-calculated numerical aggregations, percentiles, and statistical distributions.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: 'Mean Monthly Charges', value: '$64.76' },
          { label: 'Median Tenure', value: '29.0 months' },
          { label: 'Std Deviation (TotalCharges)', value: '$2,267.20' },
          { label: 'Churn Rate', value: '26.5%' },
        ].map((s, idx) => (
          <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-xs text-gray-400 font-medium">{s.label}</span>
            <div className="text-xl font-bold text-white mt-1">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
