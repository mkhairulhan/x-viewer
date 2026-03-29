// Filename: src/App.jsx

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { 
  Search, Upload, Bookmark, LayoutGrid, List, LayoutList, 
  GalleryHorizontalEnd, Sparkles, Command, Edit2, Loader2, X, ChevronLeft, ChevronRight, Sun, Moon, Menu
} from 'lucide-react';
import Fuse from 'fuse.js';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';

import { loadFromDB, clearDB, loadBookmarksFromDB, saveBookmarksToDB } from './lib/db';
import { normalizeTweet } from './lib/normalizer';
import Sidebar from './components/layout/Sidebar';
import TweetCard from './components/feed/TweetCard';
import Insights from './components/dashboard/Insights';
import Settings from './components/dashboard/Settings';
import KeyboardShortcuts from './components/layout/KeyboardShortcuts';
import { useStore } from './store/useStore';
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  const {
    bookmarks, brokenMediaIds, notes, customTags, loading, error, currentView, isMobileMenuOpen,
    searchTerm, viewMode, filterMedia, sortBy, isDarkMode, selectedTweet, lightbox,
    isSelectionMode, selectedIds, isScanning, scanProgress,
    setBookmarks, setBrokenMediaIds, setNotes, setCustomTags, setLoading, setError, setCurrentView,
    setIsMobileMenuOpen, setIsShortcutsOpen, setSearchTerm, setViewMode, setFilterMedia,
    setSortBy, toggleDarkMode, setSelectedTweet, setLightbox, setIsSelectionMode,
    setSelectedIds, toggleSelection, setIsScanning, setScanProgress, clearWorkspace
  } = useStore();

  const [dragActive, setDragActive] = useState(false);
  const searchInputRef = useRef(null);
  const scanAbortController = useRef(null);
  
  const [analytics, setAnalytics] = useState(null);
  const [parsingMessage, setParsingMessage] = useState('');

  // PHASE 7 FIX: Debounced Search State
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  const [galleryLimit, setGalleryLimit] = useState(50);
  const galleryLoaderRef = useRef(null);

  // Sync local input when external components change searchTerm (e.g., Insights Dashboard location click)
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  // PHASE 7 FIX: Debounce Hook - Waits 300ms after user stops typing before hitting Fuse.js
  useEffect(() => {
    const timeoutId = setTimeout(() => {
        if (searchTerm !== localSearchTerm) setSearchTerm(localSearchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [localSearchTerm, setSearchTerm, searchTerm]);

  // PHASE 7 FIX: Background Scroll Lock for Modals
  useEffect(() => {
    if (selectedTweet || lightbox) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedTweet, lightbox]);

  // Reset Gallery limit when changing filters
  useEffect(() => {
    setGalleryLimit(50);
  }, [searchTerm, filterMedia, sortBy, viewMode]);

  useEffect(() => {
    const init = async () => {
      try {
        const savedData = await loadBookmarksFromDB();
        if (savedData && savedData.length > 0) setBookmarks(savedData.map(normalizeTweet));
        
        const savedBroken = await loadFromDB('broken_media_ids');
        if (savedBroken) setBrokenMediaIds(new Set(savedBroken));
        
        const savedNotes = await loadFromDB('bookmark_notes');
        if (savedNotes) setNotes(savedNotes);

        const savedTags = await loadFromDB('bookmark_tags');
        if (savedTags) setCustomTags(savedTags);
      } catch (err) {
        console.error("Failed to load from IndexedDB", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [setBookmarks, setBrokenMediaIds, setNotes, setCustomTags, setLoading]);

  useEffect(() => {
    if (!bookmarks || bookmarks.length === 0) {
      setAnalytics(null);
      return;
    }
    const worker = new Worker(new URL('./workers/insights.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      if (e.data.type === 'done') setAnalytics(e.data.payload);
    };
    worker.postMessage({ bookmarks });
    return () => worker.terminate();
  }, [bookmarks]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const activeTag = document.activeElement.tagName;
      const isInputFocused = activeTag === 'INPUT' || activeTag === 'TEXTAREA';

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === '?' && !isInputFocused) {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [setIsShortcutsOpen]);

  const processFiles = (files) => {
    setLoading(true);
    setError(null);
    setParsingMessage('Initializing background worker...');

    const worker = new Worker(new URL('./workers/ingest.worker.js', import.meta.url), { type: 'module' });
    
    worker.onmessage = (e) => {
      if (e.data.type === 'progress') {
        setParsingMessage(e.data.message);
      } else if (e.data.type === 'done') {
        const { bookmarks: newBookmarks, importedNotes, importedTags } = e.data.payload;
        
        if (Object.keys(importedNotes).length > 0) {
           const mergedNotes = { ...importedNotes, ...notes }; 
           setNotes(mergedNotes);
           saveToDB('bookmark_notes', mergedNotes);
        }
        
        if (Object.keys(importedTags).length > 0) {
           const mergedTags = { ...importedTags, ...customTags };
           setCustomTags(mergedTags);
           saveToDB('bookmark_tags', mergedTags);
        }

        setBookmarks(newBookmarks);
        saveBookmarksToDB(newBookmarks); 
        
        setCurrentView('feed');
        setFilterMedia('all');
        setSortBy('date-desc');
        setLocalSearchTerm(''); // Update local input directly
        setLoading(false);
        setParsingMessage('');
        worker.terminate();
      } else if (e.data.type === 'error') {
        setError(e.data.payload);
        setLoading(false);
        setParsingMessage('');
        worker.terminate();
      }
    };

    worker.onerror = (err) => {
      setError(err.message || "Worker error occurred.");
      setLoading(false);
      setParsingMessage('');
      worker.terminate();
    };

    worker.postMessage({ files, existingBookmarks: bookmarks, existingNotes: notes, existingTags: customTags });
  };

  const handleFileUpload = (event) => {
    processFiles(Array.from(event.target.files));
    event.target.value = null;
  };

  const handleDrag = function(e) {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = function(e) {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFiles(Array.from(e.dataTransfer.files));
  };

  const handleExportJSON = () => {
    const dataToExport = isSelectionMode && selectedIds.size > 0 
      ? bookmarks.filter(b => selectedIds.has(b.id))
      : bookmarks;
    if (dataToExport.length === 0) return;

    const enrichedExport = dataToExport.map(b => ({
      ...b,
      custom_notes: notes[b.id] || null,
      custom_tags: customTags[b.id] || []
    }));

    const dataStr = JSON.stringify(enrichedExport, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `x_bookmarks_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    const dataToExport = isSelectionMode && selectedIds.size > 0 
      ? bookmarks.filter(b => selectedIds.has(b.id))
      : bookmarks;
    if (dataToExport.length === 0) return;

    let mdStr = `# X Bookmarks Export\n*Generated on ${new Date().toLocaleDateString()}*\n\n---\n\n`;

    dataToExport.forEach(b => {
      const date = new Date(b.created_at).toLocaleDateString();
      const note = notes[b.id];
      const tagsArray = customTags[b.id] || [];

      mdStr += `### ${b.user.name} (@${b.user.screen_name}) - *${date}*\n\n`;
      mdStr += `> ${b.full_text.replace(/\n/g, '\n> ')}\n\n`;
      if (note) mdStr += `**My Note:**\n_${note}_\n\n`;
      if (tagsArray.length > 0) mdStr += `**My Tags:** ${tagsArray.map(t => `#${t}`).join(', ')}\n\n`;
      mdStr += `[View on X/Twitter](${b.url})\n\n---\n\n`;
    });

    const blob = new Blob([mdStr], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `x_bookmarks_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearWorkspace = async () => {
    if (isScanning && scanAbortController.current) scanAbortController.current.abort();
    await clearDB();
    clearWorkspace();
  };

  const handleSurpriseMe = () => {
    if (processedBookmarks.length === 0) return;
    const randomIndex = Math.floor(Math.random() * processedBookmarks.length);
    setSelectedTweet(processedBookmarks[randomIndex]);
  };

  const runHealthScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    
    const mediaTweets = bookmarks.filter(b => b.media && b.media.length > 0);
    setScanProgress({ total: mediaTweets.length, current: 0, brokenFound: 0 });
    
    scanAbortController.current = new AbortController();
    const signal = scanAbortController.current.signal;
    
    let currentBroken = new Set(brokenMediaIds);
    let newlyFoundBroken = 0;
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < mediaTweets.length; i += BATCH_SIZE) {
      if (signal.aborted) break;
      
      const batch = mediaTweets.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(tweet => {
        return new Promise((resolve) => {
          if (currentBroken.has(tweet.id)) { resolve({ id: tweet.id, status: 'already_broken' }); return; }

          const mediaItem = tweet.media[0];
          const urlToCheck = mediaItem.thumbnail || mediaItem.media_url_https || mediaItem.url || mediaItem.original;
          
          if (!urlToCheck) { resolve({ id: tweet.id, status: 'no_url' }); return; }

          const img = new Image();
          img.onload = () => resolve({ id: tweet.id, status: 'ok' });
          img.onerror = () => resolve({ id: tweet.id, status: 'broken' });
          img.src = urlToCheck;
        });
      });

      const results = await Promise.all(batchPromises);
      
      results.forEach(res => {
        if (res.status === 'broken') {
          currentBroken.add(res.id);
          newlyFoundBroken++;
        }
      });
      
      setScanProgress(prev => ({ 
        ...prev, 
        current: Math.min(i + BATCH_SIZE, mediaTweets.length),
        brokenFound: prev.brokenFound + newlyFoundBroken
      }));
      newlyFoundBroken = 0; 
      
      setBrokenMediaIds(new Set(currentBroken));
      await new Promise(r => setTimeout(r, 100));
    }
    setIsScanning(false);
  };

  const stopHealthScan = () => {
    if (scanAbortController.current) scanAbortController.current.abort();
    setIsScanning(false);
  };

  const baseSearchBookmarks = useMemo(() => {
    // The engine still strictly listens to `searchTerm` (which only updates after Debounce)
    if (!searchTerm.trim()) return bookmarks;
    
    const query = searchTerm.toLowerCase();
    
    const fromMatch = query.match(/from:([a-zA-Z0-9_]+)/i);
    const locMatch = query.match(/loc:"([^"]+)"/i);
    const hasMediaMatch = query.includes('has:media');
    const hasLinksMatch = query.includes('has:links');
    const hasNoteMatch = query.includes('has:note'); 
    const hasTagMatch = query.includes('has:tag'); 
    const isQuoteMatch = query.includes('is:quote');
    const isReplyMatch = query.includes('is:reply');
    const minFavesMatch = query.match(/min_faves:(\d+)/i);
    const minRtsMatch = query.match(/min_retweets:(\d+)/i);
    
    let cleanText = query;
    const activeFilters = [
      /from:([a-zA-Z0-9_]+)/i, /loc:"([^"]+)"/i, /has:media/i, /has:links/i, 
      /has:note/i, /has:tag/i, /is:quote/i, /is:reply/i, /min_faves:(\d+)/i, /min_retweets:(\d+)/i
    ];
    activeFilters.forEach(regex => { cleanText = cleanText.replace(regex, ''); });
    const textSearch = cleanText.replace(/\s+/g, ' ').trim();

    let result = bookmarks.filter(b => {
      const hasLinks = b.full_text.includes('http'); 
      if (fromMatch && !b.user.screen_name.includes(fromMatch[1])) return false;
      if (locMatch && !b.user.location.toLowerCase().includes(locMatch[1].toLowerCase())) return false;
      if (hasMediaMatch && b.media.length === 0) return false;
      if (hasLinksMatch && !hasLinks) return false;
      if (hasNoteMatch && !notes[b.id]) return false;
      if (hasTagMatch && (!customTags[b.id] || customTags[b.id].length === 0)) return false;
      if (isQuoteMatch && !b.is_quote) return false;
      if (isReplyMatch && !b.is_reply) return false;
      if (minFavesMatch && b.metrics.favorite_count < parseInt(minFavesMatch[1])) return false;
      if (minRtsMatch && b.metrics.retweet_count < parseInt(minRtsMatch[1])) return false;
      return true;
    });

    if (textSearch) {
        const searchableData = result.map(b => ({
            ...b,
            searchable_note: notes[b.id] || "",
            searchable_tags: customTags[b.id] || []
        }));

        const fuse = new Fuse(searchableData, {
            keys: ['full_text', 'user.name', 'user.screen_name', 'tags', 'quoted_tweet.text', 'searchable_note', 'searchable_tags'],
            threshold: 0.3,
            ignoreLocation: true
        });
        result = fuse.search(textSearch).map(r => {
           const { searchable_note, searchable_tags, ...cleanItem } = r.item;
           return cleanItem;
        });
    }

    return result;
  }, [bookmarks, searchTerm, notes, customTags]);

  const counts = useMemo(() => {
    let image = 0, video = 0, text = 0, broken = brokenMediaIds.size;
    bookmarks.forEach(b => {
      if (b.media.length === 0) text++;
      else {
        const isVideo = b.media.some(m => m.type === 'video' || m.type === 'animated_gif');
        if (isVideo) video++; else image++;
      }
    });
    return { all: bookmarks.length, image, video, text, broken, noted: Object.keys(notes).length };
  }, [bookmarks, brokenMediaIds, notes]);

  const processedBookmarks = useMemo(() => {
    let result = baseSearchBookmarks;

    if (filterMedia !== 'all') {
      result = result.filter(b => {
        if (filterMedia === 'broken') return brokenMediaIds.has(b.id);
        if (filterMedia === 'notes') return !!notes[b.id] || (customTags[b.id] && customTags[b.id].length > 0);
        if (filterMedia === 'text') return b.media.length === 0;
        if (b.media.length === 0) return false;
        
        const isVideo = b.media.some(m => m.type === 'video' || m.type === 'animated_gif');
        if (filterMedia === 'video') return isVideo;
        if (filterMedia === 'image') return !isVideo; 
        return true;
      });
    }

    result = [...result].sort((a, b) => {
      if (sortBy === 'name-asc') return a.user.name.localeCompare(b.user.name);
      if (sortBy === 'name-desc') return b.user.name.localeCompare(a.user.name);
      if (sortBy === 'date-desc') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'date-asc') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'likes-desc') return b.metrics.favorite_count - a.metrics.favorite_count;
      if (sortBy === 'rt-desc') return b.metrics.retweet_count - a.metrics.retweet_count;
      return 0;
    });

    return result;
  }, [baseSearchBookmarks, filterMedia, sortBy, brokenMediaIds, notes, customTags]);

  const handleSelectAll = () => {
    const next = new Set(selectedIds);
    processedBookmarks.forEach(b => next.add(b.id));
    setSelectedIds(next);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Delete ${selectedIds.size} selected bookmarks? This will permanently remove them from your workspace.`)) {
      const nextState = bookmarks.filter(b => !selectedIds.has(b.id));
      setBookmarks(nextState);
      saveBookmarksToDB(nextState); 
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    }
  };

  useEffect(() => {
    if ((!selectedTweet && !lightbox) || isSelectionMode || currentView === 'insights' || currentView === 'settings') return;

    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

      if (lightbox) {
        if (e.key === 'ArrowLeft' && lightbox.index > 0) setLightbox({ ...lightbox, index: lightbox.index - 1 });
        else if (e.key === 'ArrowRight' && lightbox.index < lightbox.items.length - 1) setLightbox({ ...lightbox, index: lightbox.index + 1 });
        return; 
      }

      const currentIndex = processedBookmarks.findIndex(t => t.id === selectedTweet.id);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      if (e.key === 'ArrowLeft' && currentIndex > 0) nextIndex = currentIndex - 1;
      else if (e.key === 'ArrowRight' && currentIndex < processedBookmarks.length - 1) nextIndex = currentIndex + 1;

      if (nextIndex !== currentIndex) {
        setSelectedTweet(processedBookmarks[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTweet, processedBookmarks, lightbox, isSelectionMode, currentView, setLightbox, setSelectedTweet]);

  useEffect(() => {
    if (currentView !== 'feed' || viewMode !== 'gallery' || !galleryLoaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setGalleryLimit((prev) => prev + 50);
        }
      },
      { rootMargin: '800px' } 
    );
    
    observer.observe(galleryLoaderRef.current);
    return () => observer.disconnect();
  }, [currentView, viewMode, processedBookmarks]);

  return (
    <div 
      className={isDarkMode ? 'dark' : ''}
      onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
    >
      {dragActive && (
        <div className="fixed inset-0 z-[100] bg-brand-blue/20 dark:bg-brand-blue/40 backdrop-blur-sm border-4 border-dashed border-brand-blue m-4 rounded-3xl flex items-center justify-center pointer-events-none transition-all">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl text-center transform scale-110 flex flex-col items-center border border-brand-blue/20 dark:border-brand-blue/50">
              <div className="bg-brand-blue/10 dark:bg-brand-blue/20 p-4 rounded-full mb-4"><Upload className="w-12 h-12 text-brand-blue animate-bounce" /></div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">Drop JSON Files Here</h2>
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-200">
        
        <Sidebar counts={counts} />

        <main className="flex-1 flex flex-col min-w-0 min-h-screen relative overflow-x-hidden w-full">
          
          {currentView === 'insights' && analytics ? (
            <Insights 
              analytics={analytics}
              counts={counts}
              runHealthScan={runHealthScan}
              stopHealthScan={stopHealthScan}
            />
          ) : currentView === 'settings' ? (
            <Settings 
              counts={counts}
              handleFileUpload={handleFileUpload}
              handleExportJSON={handleExportJSON}
              handleExportMarkdown={handleExportMarkdown}
              handleClearWorkspace={handleClearWorkspace}
            />
          ) : (
            <>
              {/* Top Sticky Header */}
              {bookmarks.length > 0 && (
                <header className="bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 z-30 p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 transition-colors shadow-sm md:shadow-none">
                  <div className="flex flex-col gap-3 max-w-5xl mx-auto w-full">
                    
                    {/* Top Row */}
                    <div className="flex items-center gap-2 md:gap-3 w-full">
                      <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden shrink-0 p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                        <Menu className="w-5 h-5" />
                      </button>

                      <div className="relative w-full flex-1">
                        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        {/* PHASE 7 FIX: Input now binds to localSearchTerm for immediate typing rendering */}
                        <input 
                          ref={searchInputRef} type="text" placeholder={"Search (try 'loc:\"New York\"', 'has:tag', 'from:elon')"} 
                          value={localSearchTerm} onChange={(e) => { setLocalSearchTerm(e.target.value); }}
                          disabled={isSelectionMode}
                          className="w-full pl-10 pr-12 sm:pr-20 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none text-[16px] md:text-sm transition-all shadow-sm dark:text-slate-50 dark:placeholder-slate-500 disabled:opacity-50"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 opacity-50 text-[10px] font-medium text-slate-500 pointer-events-none">
                           <kbd className="hidden sm:flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700"><Command className="w-3 h-3" /> K</kbd>
                           <span className="sm:hidden font-mono px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">/</span>
                        </div>
                      </div>

                      <button 
                        onClick={handleSurpriseMe}
                        className="shrink-0 p-2.5 bg-brand-blue hover:bg-brand-hover text-white rounded-xl shadow-sm transition-colors"
                        title="Surprise Me (Random Bookmark)"
                      >
                        <Sparkles className="w-5 h-5" />
                      </button>

                      <button onClick={toggleDarkMode} className="md:hidden shrink-0 p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                        {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-brand-blue" />}
                      </button>
                    </div>
                    
                    {/* Bottom Row */}
                    <div className="flex items-center justify-start sm:justify-start gap-2.5 overflow-x-auto pb-1 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full">
                      
                      <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds(new Set()); }} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors shadow-sm shrink-0 text-sm font-medium ${isSelectionMode ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                        <Edit2 className="w-4 h-4" /> <span>{isSelectionMode ? 'Done Editing' : 'Edit Mode'}</span>
                      </button>

                      <select
                        value={sortBy}
                        onChange={(e) => { setSortBy(e.target.value); }}
                        disabled={isSelectionMode}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none text-sm font-medium transition-shadow shadow-sm disabled:opacity-50 w-full sm:w-auto"
                      >
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="likes-desc">Most Liked</option>
                        <option value="rt-desc">Most Retweeted</option>
                        <option value="name-asc">Name (A-Z)</option>
                        <option value="name-desc">Name (Z-A)</option>
                      </select>
                      
                      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 transition-colors shadow-sm ml-auto sm:ml-0 items-center">
                        <button onClick={() => setViewMode('detail')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'detail' ? 'bg-slate-100 dark:bg-slate-800 text-brand-blue' : 'text-slate-400 dark:text-slate-500'}`} title="Detail View"><List className="w-4 h-4" /></button>
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-800 text-brand-blue' : 'text-slate-400 dark:text-slate-500'}`} title="Grid View"><LayoutGrid className="w-4 h-4" /></button>
                        <button onClick={() => setViewMode('compact')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'compact' ? 'bg-slate-100 dark:bg-slate-800 text-brand-blue' : 'text-slate-400 dark:text-slate-500'}`} title="Compact List View"><LayoutList className="w-4 h-4" /></button>
                        <button onClick={() => setViewMode('gallery')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'gallery' ? 'bg-slate-100 dark:bg-slate-800 text-brand-blue' : 'text-slate-400 dark:text-slate-500'}`} title="Pinterest Gallery View"><GalleryHorizontalEnd className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                </header>
              )}

              {/* Selection Action Bar */}
              {isSelectionMode && (
                <div className="sticky top-[116px] md:top-[124px] z-[25] bg-brand-blue/10 dark:bg-brand-blue/20 border-b border-brand-blue/20 dark:border-brand-blue/30 p-3 flex justify-between items-center backdrop-blur-xl shadow-lg transition-all">
                  <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto w-full">
                    <span className="text-brand-blue font-bold text-sm md:text-base whitespace-nowrap hidden sm:block">
                      {selectedIds.size} Selected
                    </span>
                    <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                      <button onClick={handleSelectAll} className="text-xs md:text-sm px-3 py-2 rounded-xl bg-brand-blue/20 dark:bg-brand-blue/30 text-brand-blue hover:bg-brand-blue/30 font-medium transition-colors shrink-0 whitespace-nowrap">Select All</button>
                      <button onClick={() => setSelectedIds(new Set())} disabled={selectedIds.size === 0} className="text-xs md:text-sm px-3 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium disabled:opacity-50 shrink-0 shadow-sm">Deselect</button>
                      <button onClick={handleDeleteSelected} disabled={selectedIds.size === 0} className="text-xs md:text-sm px-3 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 font-medium disabled:opacity-50 shrink-0 shadow-sm ml-auto">Delete</button>
                    </div>
                  </div>
                </div>
              )}

              <div className={`p-2 sm:p-4 md:p-8 flex-1 flex flex-col items-center w-full mx-auto ${viewMode === 'detail' || viewMode === 'compact' ? 'max-w-3xl' : 'max-w-7xl'}`}>
                
                {loading && (
                  <div className="text-brand-blue font-medium py-10 flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin w-8 h-8"/>
                    <span>{parsingMessage || 'Parsing and indexing workspace...'}</span>
                  </div>
                )}
                
                {!loading && !error && bookmarks.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 py-10 sm:py-20 px-4 text-center">
                    <div className="bg-brand-blue/10 dark:bg-brand-blue/20 p-6 rounded-full mb-6 relative"><Bookmark className="w-12 h-12 text-brand-blue" /></div>
                    <h2 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-50">Workspace Empty</h2>
                    <p className="max-w-md mb-8 text-sm sm:text-base">Drag and drop your JSON files here.</p>
                    <label className="flex items-center gap-2 bg-brand-blue hover:bg-brand-hover text-white px-8 py-3.5 rounded-full cursor-pointer font-medium hover:-translate-y-0.5 transition-transform"><Upload className="w-5 h-5" /><span>Select JSON File</span><input type="file" accept=".json" multiple onChange={handleFileUpload} className="hidden" /></label>
                  </div>
                )}

                {/* VIRTUALIZED FEED RENDERER */}
                {processedBookmarks.length > 0 && (
                  viewMode === 'detail' || viewMode === 'compact' ? (
                    <div className="w-full">
                      <Virtuoso
                        useWindowScroll
                        data={processedBookmarks}
                        itemContent={(index, tweet) => (
                          <div className={viewMode === 'compact' ? 'py-1 sm:py-1.5' : 'py-2 sm:py-3'}>
                            <TweetCard tweet={tweet} />
                          </div>
                        )}
                      />
                    </div>
                  ) : viewMode === 'grid' ? (
                    <div className="w-full">
                      <VirtuosoGrid
                        useWindowScroll
                        data={processedBookmarks}
                        components={{
                          List: React.forwardRef(({ style, children, ...props }, ref) => (
                            <div 
                              ref={ref} 
                              {...props} 
                              style={{ ...style, display: 'grid' }} 
                              className="gap-3 sm:gap-4 items-start w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                            >
                              {children}
                            </div>
                          )),
                          Item: ({ children, ...props }) => (
                            <div {...props} className="w-full h-full">
                              {children}
                            </div>
                          )
                        }}
                        itemContent={(index, tweet) => <TweetCard tweet={tweet} />}
                      />
                    </div>
                  ) : (
                    <div className="w-full">
                       <div className="columns-2 md:columns-3 lg:columns-4 gap-4 w-full">
                          {processedBookmarks
                            .filter(t => t.media && t.media.length > 0)
                            .slice(0, galleryLimit)
                            .map(tweet => (
                             <div key={tweet.id} className="break-inside-avoid mb-4">
                               <TweetCard tweet={tweet} />
                             </div>
                          ))}
                       </div>
                       
                       {/* Infinite Scroll Loader Anchor */}
                       {processedBookmarks.filter(t => t.media && t.media.length > 0).length > galleryLimit && (
                         <div ref={galleryLoaderRef} className="py-10 flex items-center justify-center w-full">
                           <Loader2 className="w-8 h-8 animate-spin text-brand-blue opacity-50" />
                         </div>
                       )}
                    </div>
                  )
                )}

              </div>
            </>
          )}
        </main>

        {/* Detail Modal Overlay */}
        {selectedTweet && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-4 md:p-8 bg-black/80 dark:bg-black/95 backdrop-blur-sm" onClick={() => setSelectedTweet(null)}>
            <button onClick={() => setSelectedTweet(null)} className="absolute top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8 z-[80] p-2 sm:p-2.5 bg-black/50 hover:bg-black/70 sm:bg-white/10 sm:hover:bg-white/20 text-white rounded-full backdrop-blur-md shadow-lg border border-white/20"><X className="w-6 h-6" /></button>
            <div className="relative w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl shadow-black/50 border border-slate-700 [&::-webkit-scrollbar]:hidden" onClick={(e) => e.stopPropagation()}>
              <div className="h-14 sm:hidden bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 flex items-center px-4"><span className="font-bold text-slate-900 dark:text-slate-50">Tweet Details</span></div>
              <div className="p-0 sm:p-2">
                <TweetCard key={selectedTweet.id} tweet={selectedTweet} isModal={true} />
              </div>
            </div>
          </div>
        )}

        {/* Lightbox Overlay */}
        {lightbox && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl" onClick={() => setLightbox(null)}>
            <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 z-10 p-2 bg-white/10 text-white rounded-full shadow-lg"><X className="w-6 h-6" /></button>
            {lightbox.index > 0 && <button onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, index: lightbox.index - 1 }) }} className="absolute left-2 md:left-8 z-10 p-2 bg-white/10 text-white rounded-full"><ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" /></button>}
            {lightbox.index < lightbox.items.length - 1 && <button onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, index: lightbox.index + 1 }) }} className="absolute right-2 md:right-8 z-10 p-2 bg-white/10 text-white rounded-full"><ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" /></button>}
            
            <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-20" onClick={() => setLightbox(null)}>
              {(() => {
                const mediaItem = lightbox.items[lightbox.index];
                const isVideo = mediaItem.type === 'video' || mediaItem.type === 'animated_gif';
                let srcUrl = mediaItem.original || mediaItem.media_url_https || mediaItem.url || mediaItem.thumbnail;
                if (isVideo && mediaItem.video_info?.variants) {
                   const mp4Variants = mediaItem.video_info.variants.filter(v => v.content_type === 'video/mp4').sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0)); 
                   if(mp4Variants.length) srcUrl = mp4Variants[0].url;
                }
                return isVideo 
                  ? <video controls autoPlay playsInline className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()}><source src={srcUrl} type="video/mp4" /></video>
                  : <img src={srcUrl} alt={`Media ${lightbox.index + 1}`} className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />;
              })()}
            </div>
            {lightbox.items.length > 1 && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white bg-white/10 px-4 py-1.5 rounded-full text-sm backdrop-blur-sm">{lightbox.index + 1} / {lightbox.items.length}</div>}
          </div>
        )}

        <KeyboardShortcuts />
        <Analytics />

      </div>
    </div>
  );
}