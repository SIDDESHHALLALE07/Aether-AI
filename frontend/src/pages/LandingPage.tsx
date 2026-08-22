import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  MapPin, 
  ShieldCheck, 
  Compass, 
  Bot, 
  BarChart3, 
  ArrowRight,
  Database,
  CheckCircle2,
  Lock
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Header / Nav */}
      <nav className="h-20 border-b border-white/10 max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/25">
            <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-gray-200 to-indigo-300 bg-clip-text text-transparent">
            Aether Copilot AI
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <Link 
            to="/login"
            className="text-xs font-semibold text-gray-300 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/workspace"
            className="text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5"
          >
            Start Analyzing Free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-8 animate-pulse-subtle">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Spatial AI Data Analytics Workspace</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          From Raw Data to <br />
          <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Intelligent Insights
          </span>
        </h1>

        <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
          Transform raw datasets into clean, understandable, and actionable insights through spatial visual analytics and backend-computed AI evidence.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/workspace"
            className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-sm px-8 py-3.5 rounded-xl shadow-xl shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5"
          >
            <span>Explore Spatial Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-semibold text-sm px-8 py-3.5 rounded-xl transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>Open Dashboard</span>
          </Link>
        </div>

        {/* Data Pipeline Visual Banner */}
        <div className="mt-16 p-6 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-6">
            Autonomous Spatial Data Pipeline
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
            {[
              { title: 'Raw Data', icon: Database, color: 'text-indigo-400' },
              { title: 'Quality', icon: ShieldCheck, color: 'text-cyan-400' },
              { title: 'Cleaning', icon: Sparkles, color: 'text-purple-400' },
              { title: 'Analytics', icon: BarChart3, color: 'text-emerald-400' },
              { title: 'Patterns', icon: Compass, color: 'text-amber-400' },
              { title: 'AI Insights', icon: Bot, color: 'text-rose-400' },
            ].map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center group hover:border-indigo-500/40 transition-colors">
                  <StepIcon className={`w-6 h-6 mb-2 ${step.color}`} />
                  <span className="text-xs font-medium text-gray-300 group-hover:text-white">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="py-20 max-w-7xl mx-auto px-6 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white">Engineered for High-Precision Analytics</h2>
          <p className="mt-3 text-gray-400 text-sm">Separating exact mathematical computation from AI natural language explanation.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Spatial Analytics Canvas</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Navigate your entire dataset lifecycle visually through connected nodes. Pan, zoom, drag, and open contextual panels effortlessly.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-5">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Smart Versioned Cleaning</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Transparent 0-100 quality scoring. Impute missing values, drop duplicates, and normalize categories with non-destructive version rollback (V1 &rarr; V2).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-5">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Hidden Pattern Discovery</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Automated Pearson & Spearman correlations, Z-Score/IQR outlier detection, Isolation Forest anomaly scoring, and K-Means clustering.
            </p>
          </div>
        </div>
      </section>

      {/* Security & Free-First Stack */}
      <section className="py-16 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-4">
              <Lock className="w-3.5 h-3.5" />
              <span>Zero Hallucination Architecture</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Strict Separation of Computation & Explanation</h2>
            <p className="text-xs text-gray-400 leading-relaxed mb-6">
              Our analytics engine calculates exact aggregations, statistics, and correlations in Python. Gemini AI NEVER invents numerical results—it synthesizes clear explanations using structured evidence only.
            </p>
            <ul className="space-y-3 text-xs text-gray-300">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Never transmits raw sensitive dataset rows to external APIs</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Protected against Spreadsheet Formula Injection on export</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Supabase PostgreSQL + pgvector semantic context retrieval</span>
              </li>
            </ul>
          </div>

          <div className="p-8 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-black border border-indigo-500/20 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Free-First Technology Stack</h3>
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-300">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="font-semibold text-cyan-400 block">Frontend</span>
                <span>React 18, Vite, Tailwind CSS, Plotly.js</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="font-semibold text-purple-400 block">Backend</span>
                <span>FastAPI, Pandas, NumPy, Scikit-learn</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="font-semibold text-emerald-400 block">Database</span>
                <span>Supabase PostgreSQL + pgvector</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="font-semibold text-amber-400 block">AI Gateway</span>
                <span>Google Gemini API</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500">
        <p>© 2026 Aether Copilot AI. All rights reserved.</p>
        <div className="flex space-x-6 mt-4 sm:mt-0">
          <a href="/docs/user-guide.md" className="hover:text-gray-300">User Guide</a>
          <a href="/docs/api.md" className="hover:text-gray-300">API Documentation</a>
          <a href="/docs/security.md" className="hover:text-gray-300">Security</a>
        </div>
      </footer>
    </div>
  );
};
