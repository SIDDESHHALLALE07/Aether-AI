import React from 'react';
import { FileSpreadsheet, Upload, Search, Eye, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DatasetsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dataset Inventory</h1>
          <p className="text-xs text-gray-400 mt-1">Upload CSV or Excel files for automatic profiling, quality scoring, and smart cleaning.</p>
        </div>
        <button className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all">
          <Upload className="w-4 h-4" />
          <span>Upload Dataset</span>
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search datasets..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-white/5 text-gray-400 font-semibold border-b border-white/10 uppercase text-[10px]">
              <tr>
                <th className="p-3">Filename</th>
                <th className="p-3">Type & Size</th>
                <th className="p-3">Rows x Cols</th>
                <th className="p-3">Quality Score</th>
                <th className="p-3">Version</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-white/5 transition-colors">
                <td className="p-3 font-semibold text-white flex items-center space-x-2">
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  <span>customer_churn_analysis.csv</span>
                </td>
                <td className="p-3">CSV • 2.45 MB</td>
                <td className="p-3">10,500 x 12</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    94 / 100
                  </span>
                </td>
                <td className="p-3"><span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">V2</span></td>
                <td className="p-3 text-right space-x-2">
                  <Link to="/datasets/ds-demo-1" className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 inline-block"><Eye className="w-3.5 h-3.5" /></Link>
                  <button className="p-1.5 rounded bg-white/5 hover:bg-rose-500/10 text-rose-400 inline-block"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
