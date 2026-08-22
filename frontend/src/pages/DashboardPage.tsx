import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FolderKanban, 
  FileSpreadsheet, 
  ShieldCheck, 
  Compass, 
  Lightbulb, 
  Upload, 
  MapPin, 
  Bot,
  ArrowUpRight
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const metrics = [
    { label: 'Active Projects', value: '4', icon: FolderKanban, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
    { label: 'Datasets Managed', value: '12', icon: FileSpreadsheet, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    { label: 'Avg Quality Score', value: '92.4%', icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Discovered Patterns', value: '28', icon: Compass, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'AI Insights', value: '45', icon: Lightbulb, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Analytics Dashboard</h1>
          <p className="text-xs text-gray-400 mt-1">Overview of active project assets, quality scores, and recent pattern discoveries.</p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/datasets"
            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Dataset</span>
          </Link>
          <Link
            to="/workspace"
            className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open Spatial Canvas</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md relative overflow-hidden group hover:border-white/20 transition-colors">
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-gray-400">{m.label}</span>
                <div className={`p-2 rounded-xl border ${m.bg}`}>
                  <Icon className={`w-4 h-4 ${m.color}`} />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-white tracking-tight">{m.value}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Cards & Active Canvas Preview */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              <span>Active Workspace Datasets</span>
            </h2>
            <Link to="/datasets" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1">
              <span>View All</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { name: 'customer_churn_analysis.csv', fileType: 'CSV', size: '2.45 MB', rows: '10,500', cols: 12, quality: 94, version: 'V2' },
              { name: 'q3_financial_sales_data.xlsx', fileType: 'XLSX', size: '4.82 MB', rows: '45,200', cols: 18, quality: 88, version: 'V1' },
              { name: 'user_behavior_logs_2026.csv', fileType: 'CSV', size: '1.12 MB', rows: '8,900', cols: 9, quality: 96, version: 'V1' },
            ].map((ds, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs">
                    {ds.fileType}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-200">{ds.name}</h3>
                    <p className="text-[10px] text-gray-400">{ds.rows} rows • {ds.cols} cols • {ds.size}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs font-bold text-emerald-400">{ds.quality}/100</span>
                    <span className="text-[10px] text-gray-400 block">Quality Score</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                    {ds.version}
                  </span>
                  <Link to="/workspace" className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300">
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Copilot Quick Ask */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-black border border-indigo-500/30 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 mb-3">
              <Bot className="w-5 h-5" />
              <h2 className="text-sm font-bold text-white">Ask AI Copilot</h2>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              Query your active dataset using natural language. Fast evidence calculation backed by Gemini.
            </p>
            <div className="space-y-2">
              {[
                "What is wrong with my dataset?",
                "Find hidden correlation patterns",
                "Suggest optimal chart types",
              ].map((q, idx) => (
                <button
                  key={idx}
                  className="w-full text-left text-xs p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>

          <Link
            to="/copilot"
            className="mt-6 w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
          >
            Launch Full Copilot Chat
          </Link>
        </div>
      </div>
    </div>
  );
};
