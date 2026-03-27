// Filename: src/store/useStore.js

import { create } from 'zustand';
import { saveToDB } from '../lib/db';

export const useStore = create((set) => ({
  // Core Data State
  bookmarks: [],
  brokenMediaIds: new Set(),
  notes: {},
  customTags: {}, // PHASE 5: Added custom tags store
  loading: true,
  error: null,

  // App View State
  currentView: 'feed',
  isMobileMenuOpen: false,
  isShortcutsOpen: false,

  // Search, Filter, Sort & Theme State
  searchTerm: '',
  viewMode: 'detail',
  filterMedia: 'all',
  sortBy: 'date-desc',
  isDarkMode: false,

  // Modal & Lightbox State
  selectedTweet: null,
  lightbox: null,

  // CRUD & Selection State
  isSelectionMode: false,
  selectedIds: new Set(),

  // Scanner State
  isScanning: false,
  scanProgress: { total: 0, current: 0, brokenFound: 0 },

  // Actions
  setBookmarks: (bookmarks) => set({ bookmarks }),
  setBrokenMediaIds: (ids) => set({ brokenMediaIds: ids }),
  setNotes: (notes) => set({ notes }),
  setCustomTags: (tags) => set({ customTags: tags }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  setCurrentView: (view) => set({ currentView: view }),
  setIsMobileMenuOpen: (isOpen) => set({ isMobileMenuOpen: isOpen }),
  setIsShortcutsOpen: (isOpen) => set({ isShortcutsOpen: isOpen }),
  
  setSearchTerm: (term) => set({ searchTerm: term }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setFilterMedia: (filter) => set({ filterMedia: filter }),
  setSortBy: (sort) => set({ sortBy: sort }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  
  setSelectedTweet: (tweet) => set({ selectedTweet: tweet }),
  setLightbox: (lightbox) => set({ lightbox }),
  
  setIsSelectionMode: (isMode) => set({ isSelectionMode: isMode }),
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  toggleSelection: (id) => set((state) => {
    const next = new Set(state.selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    return { selectedIds: next };
  }),
  
  setIsScanning: (isScanning) => set({ isScanning }),
  setScanProgress: (progress) => set((state) => ({ scanProgress: typeof progress === 'function' ? progress(state.scanProgress) : progress })),

  // Complex Actions
  handleSaveNote: (tweetId, noteText) => set((state) => {
    const newNotes = { ...state.notes };
    if (!noteText.trim()) delete newNotes[tweetId];
    else newNotes[tweetId] = noteText;
    saveToDB('bookmark_notes', newNotes);
    return { notes: newNotes };
  }),

  // PHASE 5: Handle Tag Saving
  handleSaveTags: (tweetId, tagsArray) => set((state) => {
    const newTags = { ...state.customTags };
    if (!tagsArray || tagsArray.length === 0) delete newTags[tweetId];
    else newTags[tweetId] = tagsArray;
    saveToDB('bookmark_tags', newTags);
    return { customTags: newTags };
  }),

  clearWorkspace: () => set({
    bookmarks: [],
    selectedIds: new Set(),
    brokenMediaIds: new Set(),
    notes: {},
    customTags: {},
    isSelectionMode: false,
    currentView: 'feed',
    isMobileMenuOpen: false
  })
}));