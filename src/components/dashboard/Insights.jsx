// Filename: src/components/dashboard/Insights.jsx

import React from 'react';
import { 
  BarChart3, Menu, HeartCrack, PlayCircle, Loader2, Award, 
  TrendingUp, LayoutDashboard, PieChart as PieChartIcon, Briefcase, Zap, 
  MessageCircle, Heart, Clock, Users, Activity, MapPin, 
  Smartphone, Languages, Globe, Info, History
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatNum, formatTimeLatency, langMap } from '../../lib/utils.js';
import { useStore } from '../../store/useStore';

function HistoryIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-xl">
        <p className="font-bold text-slate-900 dark:text-slate-50 mb-1">{payload[0].payload.name}</p>
        <p className="text-brand-blue font-medium">{formatNum(payload[0].value)} Bookmarks</p>
      </div>
    );
  }
  return null;
};

// Graceful Degradation Empty State UI
const EmptyMetadataState = ({ label }) => (
  <div className="flex flex-col items-center justify-center text-center h-full min-h-[120px] px-4 py-6 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
    <Info className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-2" />
    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Data Unavailable</p>
    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-[200px] leading-relaxed">
      This metric requires a detailed export file containing deep <b>user metadata</b>.
    </p>
  </div>
);

export default function Insights({ analytics, counts, runHealthScan, stopHealthScan }) {
  const brokenMediaIds = useStore(state => state.brokenMediaIds);
  const isScanning = useStore(state => state.isScanning);
  const scanProgress = useStore(state => state.scanProgress);
  const setSelectedTweet = useStore(state => state.setSelectedTweet);
  const setSearchTerm = useStore(state => state.setSearchTerm);
  const setCurrentView = useStore(state => state.setCurrentView);
  const setIsMobileMenuOpen = useStore(state => state.setIsMobileMenuOpen);
  const isDarkMode = useStore(state => state.isDarkMode);

  if (!analytics) return null;

  const pieData = [
    { name: 'Video', value: counts.video, color: '#6366f1' }, 
    { name: 'Image', value: counts.image, color: '#1D9BF0' }, 
    { name: 'Text', value: counts.text, color: isDarkMode ? '#475569' : '#cbd5e1' } 
  ].filter(d => d.value > 0);

  const sourceData = analytics.topSources.map(([name, count]) => ({ name, count }));
  const langData = analytics.topLangs.map(([lang, count]) => ({ name: langMap[lang] || lang.toUpperCase(), count }));

  return (
    <div className="p-4 sm:p-6 md:p-8 flex-1 w-full max-w-7xl mx-auto space-y-6">
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mt-2 md:mt-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
             <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2 md:gap-3">
            <BarChart3 className="w-7 h-7 md:w-8 md:h-8 text-brand-blue shrink-0" /> <span className="truncate">Workspace Insights</span>
          </h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base md:mt-1.5 ml-1 md:ml-0">
          Analyzing your {counts.all} saved bookmarks locally in real-time.
        </p>
      </header>

      {/* Archive Health Scanner */}
      <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
        <div className="flex-1">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-2 text-slate-900 dark:text-slate-50">
            <HeartCrack className="w-5 h-5 text-red-500"/> Archive Health Scanner
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Check if the media in your bookmarks still exists online. This tests URLs in batches to protect your browser's performance. 
            Found <span className="font-bold text-red-500">{brokenMediaIds.size}</span> broken links so far.
          </p>
        </div>

        <div className="w-full md:w-auto shrink-0 flex flex-col items-end gap-3">
          {!isScanning ? (
            <button 
              onClick={runHealthScan}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white px-5 py-3 md:py-2.5 rounded-xl font-medium transition-colors w-full md:w-auto justify-center shadow-sm"
            >
              <PlayCircle className="w-4 h-4" /> Start Health Check
            </button>
          ) : (
            <div className="flex flex-col items-end w-full md:w-64">
              <div className="flex items-center justify-between w-full mb-2 text-sm">
                <span className="flex items-center gap-2 text-brand-blue font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" /> Scanning...
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {scanProgress.current} / {scanProgress.total}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                 <div 
                   className="h-full bg-brand-blue transition-all duration-300" 
                   style={{ width: `${(scanProgress.current / Math.max(1, scanProgress.total)) * 100}%` }}
                 ></div>
              </div>
              <button 
                onClick={stopHealthScan}
                className="text-xs text-red-500 hover:text-red-600 font-medium border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 px-3 py-2 md:py-1.5 rounded-lg transition-colors w-full md:w-auto text-center"
              >
                Stop Scan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ROW 1: TIER 1 (Basic Data) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Top 10 Viral Bookmarks */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-[400px] md:h-[450px]">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-50 shrink-0">
            <Award className="w-5 h-5 text-amber-500"/> Top 10 Viral Bookmarks
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">
            {analytics.top10Viral.length > 0 ? analytics.top10Viral.map((tweet, i) => {
              const handle = tweet.user?.screen_name || tweet.screen_name;
              const text = tweet.full_text || tweet.text || tweet.legacy?.full_text || "";
              const views = parseInt(tweet.views?.count || tweet.views_count || tweet.legacy?.views_count || 0) || 0;
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors cursor-pointer" onClick={() => setSelectedTweet(tweet)}>
                  <div className="w-6 text-center text-sm font-bold text-slate-400 shrink-0">{i + 1}</div>
                  <img src={tweet.user?.profile_image_url || tweet.profile_image_url} alt="" className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 shrink-0" onError={(e) => { e.target.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'; }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate flex items-center gap-1">
                       {tweet.user?.name || tweet.name} 
                       <span className="text-slate-500 font-normal">@{handle}</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">{text}</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full">
                    <TrendingUp className="w-3 h-3" /> {formatNum(views)}
                  </div>
                </div>
              )
            }) : <div className="text-slate-400 dark:text-slate-500 text-sm">No viral stats found.</div>}
          </div>
        </div>

        {/* Top 10 Creators Leaderboard */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-[400px] md:h-[450px]">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-50 shrink-0">
            <LayoutDashboard className="w-5 h-5 text-brand-blue"/> Top 10 Creators
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">
            {analytics.topCreators.map(([handle, data], i) => (
              <div key={handle} className="flex items-center gap-3 p-3 hover:bg-brand-blue/10 rounded-xl border border-transparent hover:border-brand-blue/30 transition-colors cursor-pointer" onClick={() => { setSearchTerm(`from:${handle}`); setCurrentView('feed'); setIsMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }); }}>
                <div className="w-6 text-center text-sm font-bold text-slate-400 shrink-0">{i + 1}</div>
                <img src={data.avatar} alt={handle} className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 shrink-0" onError={(e) => { e.target.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'; }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">{data.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">@{handle}</div>
                </div>
                <div className="bg-brand-blue/20 text-brand-blue text-sm font-bold px-3 py-1 rounded-full shrink-0">
                  {data.count} <span className="text-xs font-normal opacity-80 hidden sm:inline">saved</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ROW 2: Overview & Content Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Media Type Analysis */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6 text-slate-900 dark:text-slate-50">
            <PieChartIcon className="w-5 h-5 text-purple-500"/> Media Type Analysis
          </h3>
          <div className="flex-1 flex flex-col justify-center items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-2 w-full mt-4 text-center">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800/50 flex flex-col items-center justify-center">
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                   {formatNum(counts.video)} <span className="text-xs font-medium opacity-70">({Math.round((counts.video / Math.max(1, counts.all)) * 100)}%)</span>
                </div>
                <div className="text-[10px] font-medium text-indigo-800 dark:text-indigo-300 uppercase mt-0.5">Video</div>
              </div>
              <div className="bg-brand-blue/10 py-2 rounded-xl border border-brand-blue/20 flex flex-col items-center justify-center">
                <div className="text-lg font-bold text-brand-blue flex items-center gap-1.5">
                   {formatNum(counts.image)} <span className="text-xs font-medium opacity-70">({Math.round((counts.image / Math.max(1, counts.all)) * 100)}%)</span>
                </div>
                <div className="text-[10px] font-medium text-brand-blue uppercase mt-0.5">Image</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 py-2 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                <div className="text-lg font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                   {formatNum(counts.text)} <span className="text-xs font-medium opacity-70">({Math.round((counts.text / Math.max(1, counts.all)) * 100)}%)</span>
                </div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase mt-0.5">Text</div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Categories */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-full min-h-[250px]">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-50">
            <Briefcase className="w-5 h-5 text-indigo-500"/> Prof. Categories
          </h3>
          <div className="flex-1 flex flex-wrap gap-2 content-start">
            {analytics.topCategories.length > 0 ? analytics.topCategories.map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg h-fit">
                <span className="font-medium text-sm">{cat}</span>
                <span className="text-[10px] bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-1.5 py-0.5 rounded-md font-bold">{count}</span>
              </div>
            )) : <div className="w-full h-full flex items-center justify-center"><EmptyMetadataState /></div>}
          </div>
        </div>

      </div>

      {/* ROW 3: Engagement Deep Dive */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Ratioed (Quote-to-Like) */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-50" title="High quotes compared to likes often indicates controversial tweets">
            <Zap className="w-5 h-5 text-orange-500"/> Most "Ratioed"
          </h3>
          <div className="space-y-3">
            {analytics.topRatioed.length > 0 ? analytics.topRatioed.map((item, i) => (
              <div key={i} className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-xl border border-orange-100 dark:border-orange-800/30 cursor-pointer hover:border-orange-300 transition-colors" onClick={() => setSelectedTweet(item.tweet)}>
                <div className="text-sm text-slate-800 dark:text-slate-200 line-clamp-2 mb-2">"{item.tweet.full_text || item.tweet.text || item.tweet.legacy?.full_text}"</div>
                <div className="flex items-center gap-3 text-xs font-bold text-orange-700 dark:text-orange-400">
                   <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3"/> {formatNum(item.quotes)}</span>
                   <span className="flex items-center gap-1"><Heart className="w-3 h-3"/> {formatNum(item.likes)}</span>
                </div>
              </div>
            )) : <div className="text-slate-400 dark:text-slate-500 text-sm">Not enough data.</div>}
          </div>
        </div>

        {/* Creation Latency */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-50" title="Fastest response time to a quoted tweet">
            <Clock className="w-5 h-5 text-teal-500"/> Fastest Reactions
          </h3>
          <div className="space-y-3">
            {analytics.topReactions.length > 0 ? analytics.topReactions.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-teal-300 transition-colors" onClick={() => setSelectedTweet(item.tweet)}>
                <div className="min-w-0 pr-3">
                   <div className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">@{item.tweet.core?.user_results?.result?.legacy?.screen_name || item.tweet.screen_name || item.tweet.user?.screen_name || 'user'}</div>
                   <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">replied to @{item.quotedHandle}</div>
                </div>
                <div className="shrink-0 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-bold text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                   {formatTimeLatency(item.diffMins)}
                </div>
              </div>
            )) : <div className="text-slate-400 dark:text-slate-500 text-sm">No quoted reaction data.</div>}
          </div>
        </div>

        {/* Oldest Bookmarks Fallback */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-50">
            <History className="w-5 h-5 text-stone-500"/> Oldest Bookmarks
          </h3>
          <div className="space-y-3">
            {analytics.oldestBookmarks && analytics.oldestBookmarks.length > 0 ? analytics.oldestBookmarks.map((tweet, i) => (
              <div key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors" onClick={() => setSelectedTweet(tweet)}>
                <div className="flex items-center gap-2 min-w-0">
                   <img src={tweet.user?.profile_image_url} alt="" className="w-6 h-6 rounded-full" onError={(e) => { e.target.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'; }} />
                   <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">@{tweet.user?.screen_name}</span>
                </div>
                <div className="text-xs font-bold text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded whitespace-nowrap">
                   {new Date(tweet.created_at).getFullYear()}
                </div>
              </div>
            )) : <div className="text-slate-400 dark:text-slate-500 text-sm">No timeline data found.</div>}
          </div>
        </div>

      </div>

      <div className="my-8 flex items-center gap-4">
        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deep Metadata Required Below</span>
        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
      </div>

      {/* ROW 4: TIER 2 (Requires Deep Metadata) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Top Influencers */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-full">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-50">
            <Users className="w-5 h-5 text-pink-500"/> Top Influencers
          </h3>
          <div className="flex-1">
            {analytics.topInfluencers.length > 0 ? (
              <div className="space-y-3">
                {analytics.topInfluencers.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <img src={item.avatar} alt="" className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700" onError={(e) => { e.target.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'; }} />
                    <div className="flex-1 min-w-0">
                       <div className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate flex items-center gap-1">@{item.handle}</div>
                       <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{formatNum(item.followers)} <span className="hidden sm:inline">Flwrs</span> / {formatNum(item.following)} <span className="hidden sm:inline">Frnds</span></div>
                    </div>
                    <div className="shrink-0 text-pink-600 dark:text-pink-400 font-bold text-sm">{formatNum(Math.round(item.ratio))}:1</div>
                  </div>
                ))}
              </div>
            ) : <EmptyMetadataState />}
          </div>
        </div>

        {/* Oldest Accounts */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-full">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-50">
            <HistoryIcon className="w-5 h-5 text-stone-500"/> Oldest Creators
          </h3>
          <div className="flex-1">
            {analytics.oldestAccounts.length > 0 ? (
              <div className="space-y-3">
                {analytics.oldestAccounts.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-2 min-w-0">
                       <img src={item.avatar} alt="" className="w-6 h-6 rounded-full" onError={(e) => { e.target.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'; }} />
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">@{item.handle}</span>
                    </div>
                    <div className="text-xs font-bold text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded">
                       {item.created_at.getFullYear()}
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyMetadataState />}
          </div>
        </div>

        {/* Power Users */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-full">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-50">
            <Activity className="w-5 h-5 text-rose-500"/> Power Users
          </h3>
          <div className="flex-1">
            {analytics.powerUsers.length > 0 ? (
              <div className="space-y-3">
                {analytics.powerUsers.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-2 min-w-0">
                       <img src={item.avatar} alt="" className="w-6 h-6 rounded-full" onError={(e) => { e.target.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'; }} />
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">@{item.handle}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-rose-600 dark:text-rose-400">{Math.round(item.tpDay)}</div>
                      <div className="text-[9px] text-slate-400 uppercase">tweets/day</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyMetadataState />}
          </div>
        </div>

      </div>

      {/* ROW 5: Sources & Languages (Bar Charts) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12">
        
        {/* Active Locations */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-full min-h-[250px]">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-50">
            <MapPin className="w-5 h-5 text-emerald-500"/> Active Locations
          </h3>
          <div className="flex-1">
            {analytics.topLocations.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 content-start">
                {analytics.topLocations.map(([loc, count]) => (
                  <button 
                    key={loc} 
                    onClick={() => {
                      setSearchTerm(`loc:"${loc}"`);
                      setCurrentView('feed');
                      setIsMobileMenuOpen(false);
                      window.scrollTo({ top: 0, behavior: 'instant' });
                    }}
                    className="flex items-center gap-1.5 bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-900/20 border border-slate-200 hover:border-emerald-200 dark:border-slate-700 dark:hover:border-emerald-800/50 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-400 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-left h-fit"
                  >
                    <span className="font-medium text-sm truncate max-w-[150px]">{loc}</span>
                    <span className="text-[10px] font-bold opacity-70 bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-md">{count}</span>
                  </button>
                ))}
              </div>
            ) : <div className="w-full h-full flex items-center justify-center"><EmptyMetadataState /></div>}
          </div>
        </div>

        {/* Creator Devices */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-50">
            <Smartphone className="w-5 h-5 text-cyan-500"/> Creator Devices
          </h3>
          <div className="space-y-4 mt-6">
            {analytics.topSources.length > 0 ? analytics.topSources.map(([source, count]) => {
              const pct = Math.round((count / Math.max(1, counts.all)) * 100);
              return (
                <div key={source}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-4">{source}</span>
                    <span className="text-slate-500 font-bold shrink-0">{pct}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            }) : <div className="text-slate-400 dark:text-slate-500 text-sm mt-4 ml-4">No device data found.</div>}
          </div>
        </div>

        {/* Profile Languages */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-50" title="The native language set on the creator's profile">
            <Globe className="w-5 h-5 text-violet-500"/> Profile Languages
          </h3>
          <div className="space-y-4 mt-6">
            {analytics.topProfileLangs && analytics.topProfileLangs.length > 0 ? analytics.topProfileLangs.map(([lang, count]) => {
              const pct = Math.round((count / Math.max(1, counts.all)) * 100);
              return (
                <div key={lang}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{langMap[lang] || lang.toUpperCase()}</span>
                    <span className="text-slate-500 font-bold shrink-0">{pct}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            }) : <div className="w-full h-full flex items-center justify-center"><EmptyMetadataState /></div>}
          </div>
        </div>

      </div>
    </div>
  );
}