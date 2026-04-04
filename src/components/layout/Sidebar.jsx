// Filename: src/components/layout/Sidebar.jsx

import React from "react";
import {
  Bookmark as BookmarkIcon,
  LayoutDashboard as DashboardIcon,
  Image as ImgIcon,
  Film as FilmIcon,
  FileText as TextIcon,
  StickyNote as NoteIcon,
  HeartCrack as BrokenIcon,
  BarChart3 as ChartIcon,
  Settings as SettingsIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  X as XIcon,
  Keyboard as KeyboardIcon,
} from "lucide-react";
import { useStore } from "../../store/useStore";

export default function Sidebar({ counts }) {
  const bookmarks = useStore((state) => state.bookmarks);
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const filterMedia = useStore((state) => state.filterMedia);
  const setFilterMedia = useStore((state) => state.setFilterMedia);
  const isDarkMode = useStore((state) => state.isDarkMode);
  const toggleDarkMode = useStore((state) => state.toggleDarkMode);
  const isMobileMenuOpen = useStore((state) => state.isMobileMenuOpen);
  const setIsMobileMenuOpen = useStore((state) => state.setIsMobileMenuOpen);
  const setIsSelectionMode = useStore((state) => state.setIsSelectionMode);
  const setIsShortcutsOpen = useStore((state) => state.setIsShortcutsOpen);

  const bookmarksCount = bookmarks.length;

  const NavButton = ({
    id,
    label,
    icon: Icon,
    count,
    isSpecialView = false,
    isWarning = false,
  }) => {
    let active = false;
    if (isSpecialView) {
      active = currentView === id;
    } else {
      active = currentView === "feed" && filterMedia === id;
    }

    let baseClasses = active
      ? "bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue font-semibold"
      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800";

    if (isWarning && active) {
      baseClasses =
        "bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold";
    } else if (isWarning && !active && count > 0) {
      baseClasses =
        "text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20";
    }

    return (
      <button
        onClick={() => {
          if (isSpecialView) {
            setCurrentView(id);
            setIsSelectionMode(false);
          } else {
            setCurrentView("feed");
            setFilterMedia(id);
          }
          setIsMobileMenuOpen(false);
        }}
        className={`flex items-center justify-between shrink-0 w-full px-3 py-2.5 rounded-xl transition-all outline-none ${baseClasses}`}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
          <span className="whitespace-nowrap text-sm">{label}</span>
        </div>
        {count !== undefined && (
          <span
            className={`text-[11px] py-0.5 px-2 rounded-full font-medium ml-3 transition-colors ${
              active
                ? isWarning
                  ? "bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300"
                  : "bg-brand-blue/20 dark:bg-brand-blue/30 text-brand-blue dark:text-brand-blue"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            }`}
          >
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:sticky md:top-0 md:w-56 lg:w-64 h-screen flex flex-col`}
      >
        <div className="p-4 md:p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-brand-blue p-2 rounded-xl shadow-sm shadow-brand-blue/30">
              <BookmarkIcon className="text-white w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight">
              Siftstrym
            </h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 -mr-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 min-h-0 overflow-y-auto flex flex-col gap-1 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {bookmarksCount > 0 && (
            <>
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-2 mt-2">
                Library
              </div>
              <NavButton
                id="all"
                label="All Bookmarks"
                icon={DashboardIcon}
                count={counts.all}
              />
              <NavButton
                id="image"
                label="Images"
                icon={ImgIcon}
                count={counts.image}
              />
              <NavButton
                id="video"
                label="Videos"
                icon={FilmIcon}
                count={counts.video}
              />
              <NavButton
                id="text"
                label="Text Only"
                icon={TextIcon}
                count={counts.text}
              />
              {(counts.noted > 0 ||
                Object.keys(useStore.getState().customTags).length > 0) && (
                <NavButton
                  id="notes"
                  label="My Annotations"
                  icon={NoteIcon}
                  count={counts.noted}
                />
              )}
              {counts.broken > 0 && (
                <NavButton
                  id="broken"
                  label="Broken Media"
                  icon={BrokenIcon}
                  count={counts.broken}
                  isWarning={true}
                />
              )}

              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-5 mb-1.5 ml-2">
                Analytics
              </div>
              <NavButton
                id="insights"
                label="Insights Dashboard"
                icon={ChartIcon}
                isSpecialView={true}
              />

              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-5 mb-1.5 ml-2">
                System
              </div>
              <NavButton
                id="settings"
                label="Workspace Settings"
                icon={SettingsIcon}
                isSpecialView={true}
              />
            </>
          )}
        </nav>

        <div className="p-4 md:p-5 border-t border-slate-200 dark:border-slate-800 shrink-0 hidden md:block space-y-2">
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium outline-none text-sm"
          >
            <div className="flex items-center gap-3">
              <KeyboardIcon className="w-4 h-4 md:w-5 md:h-5" />
              <span>Shortcuts</span>
            </div>
            <kbd className="hidden md:block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-300">
              ?
            </kbd>
          </button>

          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium outline-none text-sm"
          >
            {isDarkMode ? (
              <SunIcon className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
            ) : (
              <MoonIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-blue" />
            )}
            <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
