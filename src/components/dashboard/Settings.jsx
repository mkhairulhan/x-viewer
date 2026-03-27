// Filename: src/components/dashboard/Settings.jsx

import React from 'react';
import { 
  Settings as SettingsIcon, Database, HardDriveDownload, 
  Trash2, Upload, AlertTriangle, FileJson, FileText, Menu 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatNum } from '../../lib/utils';

export default function Settings({ counts, handleFileUpload, handleExportJSON, handleExportMarkdown, handleClearWorkspace }) {
  const setIsMobileMenuOpen = useStore(state => state.setIsMobileMenuOpen);

  return (
    <div className="p-4 sm:p-6 md:p-8 flex-1 w-full max-w-4xl mx-auto space-y-6 md:space-y-8">
      
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mt-2 md:mt-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
             <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2 md:gap-3">
            <SettingsIcon className="w-7 h-7 md:w-8 md:h-8 text-slate-400 shrink-0" /> 
            <span className="truncate">Workspace Settings</span>
          </h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base md:mt-1.5 ml-1 md:ml-0">
          Manage your local database, exports, and imports.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Data Import Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2.5 bg-brand-blue/10 dark:bg-brand-blue/20 rounded-xl"><Database className="w-5 h-5 text-brand-blue" /></div>
             <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Local Database</h3>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-1">
            Your workspace currently securely holds <span className="font-bold text-slate-700 dark:text-slate-200">{formatNum(counts.all)}</span> bookmarks in your browser's local storage.
          </p>
          
          <label className="flex items-center justify-center gap-2 w-full bg-brand-blue hover:bg-brand-hover text-white px-4 py-3 rounded-xl cursor-pointer transition-colors shadow-sm font-medium">
            <Upload className="w-5 h-5" />
            <span>Import / Merge JSON File</span>
            <input type="file" accept=".json" multiple onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Data Export Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl"><HardDriveDownload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
             <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Export Workspace</h3>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-1">
            Download your bookmarks, including your custom notes and tags, for backup or to share across devices.
          </p>
          
          <div className="grid grid-cols-2 gap-3 w-full">
            <button onClick={handleExportJSON} className="flex items-center justify-center gap-2 w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-3 rounded-xl transition-colors shadow-sm font-medium border border-slate-200 dark:border-slate-600">
              <FileJson className="w-4 h-4" /> <span>JSON</span>
            </button>
            <button onClick={handleExportMarkdown} className="flex items-center justify-center gap-2 w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-3 rounded-xl transition-colors shadow-sm font-medium border border-slate-200 dark:border-slate-600">
              <FileText className="w-4 h-4" /> <span>Markdown</span>
            </button>
          </div>
        </div>

      </div>

      {/* Danger Zone */}
      <div className="mt-8">
        <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-4 ml-1">Danger Zone</h3>
        <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-6 border border-red-200 dark:border-red-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
           <div>
              <h4 className="text-red-700 dark:text-red-400 font-bold mb-1 flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4" /> Delete All Data
              </h4>
              <p className="text-red-600/80 dark:text-red-400/80 text-sm max-w-xl">
                 This will completely wipe the IndexedDB database in your browser, removing all bookmarks, notes, and tags. This action cannot be undone. Please export your JSON first.
              </p>
           </div>
           <button onClick={handleClearWorkspace} className="shrink-0 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-3 rounded-xl transition-colors shadow-sm font-medium w-full md:w-auto">
             <Trash2 className="w-4 h-4" /> <span>Clear Workspace</span>
           </button>
        </div>
      </div>

    </div>
  );
}