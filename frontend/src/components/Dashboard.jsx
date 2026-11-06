// Dashboard.jsx
import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, CreditCard, Receipt, Lightbulb, BrainCircuit, BarChart3, RefreshCw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://aiinvoicebackend.onrender.com";

const COLORS = ['#8b5cf6', '#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

const Dashboard = ({ batchId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [aiData, setAiData] = useState({ summary: "", insights: [], recommendations: [] });
  const [loadingInsights, setLoadingInsights] = useState(false);

  const fetchStats = async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard-stats?batch_id=${batchId}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    if (!batchId) return;
    setLoadingInsights(true);
    try {
      const response = await fetch(`${API_BASE_URL}/insights?batch_id=${batchId}`);
      const data = await response.json();
      
      if (data) {
        setAiData({
          summary: data.summary || "Summary not available.",
          insights: data.insights || [],
          recommendations: data.recommendations || []
        });
      }
    } catch (error) {
      console.error("Insights fetch fail hua:", error);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (batchId) {
      fetchStats();
      fetchInsights();
    } else {
      setStats(null);
      setAiData({ summary: "", insights: [], recommendations: [] });
    }
  }, [batchId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 space-y-4">
      <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      <p className="text-purple-600 font-semibold text-base sm:text-lg tracking-wide">Compiling Analytics...</p>
    </div>
  );
  
  if (!batchId || !stats) return null;

  const totalBillsCount = Object.values(stats.merchant_summary || {}).reduce((a, b) => a + b, 0);

  if (totalBillsCount < 2) {
    return null; 
  }

  const categoryData = Object.keys(stats.category_summary || {}).map(key => ({
    name: key,
    value: stats.category_summary[key]
  }));

  const merchantData = Object.keys(stats.merchant_summary || {})
    .map(key => ({
      name: key.length > 10 ? key.substring(0, 10) + ".." : key,
      count: stats.merchant_summary[key]
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  return (
    <div className="w-full max-w-7xl mx-auto my-4 sm:my-10 space-y-4 sm:space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/60 backdrop-blur-xl p-5 sm:p-6 sm:px-8 rounded-2xl sm:rounded-3xl border border-white/80 shadow-sm gap-3 sm:gap-0">
        <div>
          <h2 className="text-xl sm:text-3xl font-extrabold text-gray-800 tracking-tight">Financial Overview</h2>
          <p className="text-gray-500 text-xs sm:text-sm font-medium mt-0.5">Batch ID: <span className="font-mono text-purple-600 truncate inline-block max-w-[180px] align-bottom">{batchId}</span></p>
        </div>
        <button 
          onClick={() => { fetchStats(); fetchInsights(); }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-purple-100 text-gray-700 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm hover:bg-white hover:shadow-md active:scale-95 transition-all"
        >
          <RefreshCw size={15} className="text-purple-600" />
          Refresh Data
        </button>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white/70 backdrop-blur-xl p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/80 shadow-sm flex items-center">
          <div className="bg-purple-100/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl mr-4"><CreditCard className="text-purple-600" size={24} /></div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Total Spend</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-800">₹{stats.total_expense?.toFixed(2) || 0}</p>
          </div>
        </div>
        
        <div className="bg-white/70 backdrop-blur-xl p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/80 shadow-sm flex items-center">
          <div className="bg-teal-100/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl mr-4"><Receipt className="text-teal-600" size={24} /></div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Total Tax Paid</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-800">₹{stats.total_tax?.toFixed(2) || 0}</p>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/80 shadow-sm flex items-center">
          <div className="bg-blue-100/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl mr-4"><Activity className="text-blue-600" size={24} /></div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Unique Merchants</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-800">{Object.keys(stats.merchant_summary || {}).length}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        <div className="bg-white/60 backdrop-blur-xl p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/80 shadow-sm flex flex-col h-[360px] sm:h-[420px]">
          <h3 className="font-bold text-gray-700 mb-4 sm:mb-6 flex items-center gap-2 text-base sm:text-lg">
            <PieChart className="text-purple-500 w-4 h-4 sm:w-5 sm:h-5" /> Category Breakdown
          </h3>
          <div className="flex-grow w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={5} dataKey="value" stroke="rgba(255,255,255,0.5)" strokeWidth={2}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `₹${value.toFixed(2)}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', backgroundColor: 'rgba(255,255,255,0.95)', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-xl p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/80 shadow-sm flex flex-col h-[360px] sm:h-[420px]">
          <h3 className="font-bold text-gray-700 mb-4 sm:mb-6 flex items-center gap-2 text-base sm:text-lg">
            <BarChart3 className="text-teal-500 w-4 h-4 sm:w-5 sm:h-5" /> Top Merchants
          </h3>
          <div className="flex-grow w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={merchantData} margin={{ top: 10, right: 10, left: -25, bottom: 25 }}>
                <XAxis dataKey="name" tick={{fontSize: 10, fill: '#6b7280'}} interval={0} angle={-35} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{fill: '#6b7280', fontSize: 10}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(139, 92, 246, 0.05)'}} 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', backgroundColor: 'rgba(255,255,255,0.95)', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="url(#colorGradient)" radius={[6, 6, 0, 0]} barSize={28} />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* COMPREHENSIVE AI SECTION */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-md">
        <div className="bg-gradient-to-r from-purple-600/90 to-teal-500/90 backdrop-blur-md p-4 sm:p-6 border-b border-white/20">
          <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center tracking-wide">
            <BrainCircuit className="mr-2.5 text-teal-200" size={22} />
            AI Financial Intelligence
          </h3>
        </div>

        {loadingInsights ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center space-y-3">
             <BrainCircuit className="text-purple-400 animate-pulse w-10 h-10" />
             <p className="text-gray-500 font-semibold text-sm">Extracting intelligent insights...</p>
          </div>
        ) : (
          <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 bg-white/20">
            
            {/* 1. AI Summary */}
            <div className="bg-white/80 backdrop-blur-md p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white shadow-sm">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center text-base sm:text-lg border-b border-gray-100 pb-2">
                <Activity className="mr-2 text-blue-500" size={18} />
                Spending Summary
              </h4>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed font-medium">
                {aiData.summary}
              </p>
            </div>

            {/* 2. Key Insights */}
            <div className="bg-white/80 backdrop-blur-md p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white shadow-sm">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center text-base sm:text-lg border-b border-gray-100 pb-2">
                <BarChart3 className="mr-2 text-purple-500" size={18} />
                Key Insights
              </h4>
              <ul className="space-y-2 sm:space-y-3">
                {aiData.insights && aiData.insights.length > 0 ? (
                  aiData.insights.map((item, idx) => (
                    <li key={idx} className="flex items-start text-xs sm:text-sm text-gray-600 font-medium">
                      <span className="text-purple-500 mr-2 font-bold">•</span> {item}
                    </li>
                  ))
                ) : (
                  <li className="text-xs sm:text-sm text-gray-400 italic">No insights available.</li>
                )}
              </ul>
            </div>

            {/* 3. Financial Recommendations */}
            <div className="bg-white/80 backdrop-blur-md p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white shadow-sm">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center text-base sm:text-lg border-b border-gray-100 pb-2">
                <Lightbulb className="mr-2 text-teal-500" size={18} />
                Recommendations
              </h4>
              <ul className="space-y-2 sm:space-y-3">
                {aiData.recommendations && aiData.recommendations.length > 0 ? (
                  aiData.recommendations.map((item, idx) => (
                    <li key={idx} className="flex items-start text-xs sm:text-sm text-gray-600 font-medium">
                      <span className="text-teal-500 mr-2 font-bold">→</span> {item}
                    </li>
                  ))
                ) : (
                  <li className="text-xs sm:text-sm text-gray-400 italic">No recommendations available.</li>
                )}
              </ul>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;