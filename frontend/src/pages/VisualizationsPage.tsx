import React from 'react';
import { PieChart } from 'lucide-react';

export const VisualizationsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Interactive Visualizations</h1>
          <p className="text-xs text-gray-400 mt-1">Plotly powered charts with automated recommendations based on data types.</p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md min-h-[350px] flex items-center justify-center text-center">
        <div>
          <PieChart className="w-12 h-12 text-indigo-400 mx-auto mb-3 animate-pulse" />
          <h3 className="text-sm font-semibold text-white">Interactive Plotly Canvas Ready</h3>
          <p className="text-xs text-gray-400 mt-1">Select variables X (Tenure) and Y (MonthlyCharges) to generate scatter & heatmap plots.</p>
        </div>
      </div>
    </div>
  );
};
