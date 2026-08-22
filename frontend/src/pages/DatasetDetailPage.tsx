import React from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, Table } from 'lucide-react';

export const DatasetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">customer_churn_analysis.csv</h1>
          <p className="text-xs text-gray-400 mt-1">Dataset ID: {id || 'ds-demo-1'} • Active Version: V2</p>
        </div>
        <div className="flex space-x-2">
          <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Quality Score: 94/100</span>
          </span>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
          <Table className="w-4 h-4 text-cyan-400" />
          <span>Dataset Rows Preview (Showing 1-10 of 10,500)</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-white/5 text-gray-400 font-semibold border-b border-white/10 uppercase text-[10px]">
              <tr>
                <th className="p-2.5">CustomerID</th>
                <th className="p-2.5">Tenure</th>
                <th className="p-2.5">MonthlyCharges</th>
                <th className="p-2.5">TotalCharges</th>
                <th className="p-2.5">Contract</th>
                <th className="p-2.5">Churn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="hover:bg-white/5">
                  <td className="p-2.5 text-indigo-300">CUST-{7584 + idx}</td>
                  <td className="p-2.5">{12 + idx * 4} months</td>
                  <td className="p-2.5">${(65.5 + idx * 8.2).toFixed(2)}</td>
                  <td className="p-2.5">${(1200.5 + idx * 450).toFixed(2)}</td>
                  <td className="p-2.5">{idx % 2 === 0 ? 'Month-to-month' : 'One year'}</td>
                  <td className="p-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${idx % 2 === 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                      {idx % 2 === 0 ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
