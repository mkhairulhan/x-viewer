// Filename: src/components/feed/TweetCard.jsx

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Circle, HeartCrack, Layers, StickyNote, 
  Edit2, Calendar, MessageCircle, Repeat2, Heart,
  Bookmark, Quote, TrendingUp, Code, Sparkles, FileText, BadgeCheck
} from 'lucide-react';
import { useStore } from '../../store/useStore';

const failedImageUrls = new Set();

const TweetCard = ({ tweet, isModal = false }) => {
  const tweetId = tweet.id || tweet.id_str || tweet.rest_id;

  const [isEditingNote, setIsEditingNote] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // Core Store Actions & States
  const viewMode = useStore(state => state.viewMode);
  const isSelectionMode = useStore(state => state.isSelectionMode);
  const setSelectedTweet = useStore(state => state.setSelectedTweet);
  const toggleSelection = useStore(state => state.toggleSelection);
  const setLightbox = useStore(state => state.setLightbox);
  const saveNoteAction = useStore(state => state.handleSaveNote);

  // HIGH PERFORMANCE SELECTORS
  const isSelected = useStore(state => state.selectedIds.has(tweetId));
  const isBroken = useStore(state => state.brokenMediaIds.has(tweetId));
  const note = useStore(state => state.notes[tweetId]);

  const [localNoteText, setLocalNoteText] = useState(note || "");

  useEffect(() => {
    setLocalNoteText(note || "");
  }, [note]);

  const formattedDate = new Date(tweet.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const hasMedia = tweet.media && tweet.media.length > 0;
  
  const getMediaUrl = () => {
    if (!hasMedia) return null;
    const media = tweet.media[0];
    if (media.type === 'video' || media.type === 'animated_gif') return media.thumbnail || media.media_url_https || media.url; 
    return media.original || media.media_url_https || media.url || media.thumbnail;
  };
  
  const mediaUrl = getMediaUrl();
  const profileImg = tweet.profile_image_url || tweet.user?.profile_image_url || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';

  const formatNum = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num;
  };

  const handleCardClick = () => {
    if (isSelectionMode) {
      toggleSelection(tweetId);
    } else {
      setSelectedTweet(tweet);
    }
  };

  const handleMediaClick = (mediaArray, index) => {
    if (isSelectionMode) return;
    setLightbox({ items: mediaArray, index });
  };

  const handleSaveNote = () => {
     saveNoteAction(tweetId, localNoteText);
     setIsEditingNote(false);
  };

  // Safe Image Fallback Handler - Prevents Virtuoso Thrashing & Handles Avatars Beautifully
  const handleImageError = (e, source) => {
     e.target.onerror = null; // Prevent infinite loops if the fallback itself fails
     
     if (source.includes('Avatar')) {
        // Use standard Twitter blank silhouette for broken profiles
        e.target.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
     } else {
        // Use structural SVG placeholder for missing media to preserve DOM height
        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZmlsbD0iIzY2NiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5NZWRpYSBVbmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
     }
  };

  let cardClasses = 'relative bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all ';
  if (isSelectionMode) {
      cardClasses += isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/20 cursor-pointer ' : 'opacity-80 scale-[0.98] cursor-pointer ';
  } else {
      cardClasses += (!isModal && viewMode !== 'gallery') ? 'hover:border-blue-300 dark:hover:border-blue-500 cursor-pointer ' : 'cursor-pointer ';
  }

  const CheckboxOverlay = () => {
    if (!isSelectionMode || isModal) return null;
    return (
      <div className="absolute top-3 right-3 z-20 bg-white dark:bg-gray-800 rounded-full shadow-sm">
        {isSelected ? <CheckCircle2 className="w-6 h-6 text-blue-500 fill-white dark:fill-gray-800" /> : <Circle className="w-6 h-6 text-gray-300 dark:text-gray-600 fill-white dark:fill-gray-800" />}
      </div>
    );
  };

  if (!isModal && viewMode === 'gallery') {
    return (
      <article onClick={handleCardClick} className={`${cardClasses} rounded-2xl group w-full`}>
        <CheckboxOverlay />
        <div className="w-full relative overflow-hidden bg-gray-100 dark:bg-gray-700 min-h-[150px]">
           {isBroken && <div className="absolute inset-0 bg-red-900/40 z-10 flex items-center justify-center"><HeartCrack className="w-8 h-8 text-white opacity-80" /></div>}
           <img 
              src={mediaUrl} 
              alt="Gallery media" 
              className={`w-full h-auto block object-cover transition-transform duration-500 group-hover:scale-105 ${isSelectionMode && 'pointer-events-none'}`}
             
              onError={(e) => handleImageError(e, 'Gallery Media', mediaUrl)}
           />
           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 pointer-events-none">
              <div className="flex items-center gap-2 mb-1">
                <img src={profileImg} alt="" className="w-6 h-6 rounded-full border border-white/30 shrink-0" onError={(e) => handleImageError(e, 'Avatar')} />
                <span className="font-bold text-white text-sm truncate">{tweet.name || tweet.user?.name}</span>
                {tweet.user?.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
              </div>
              <p className="text-white/80 text-xs line-clamp-2">{tweet.full_text || tweet.text}</p>
           </div>
           
           {tweet.media.length > 1 && (
              <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-bold backdrop-blur-md z-10">
                <Layers className="w-3.5 h-3.5" /> {tweet.media.length}
              </div>
           )}
           {tweet.media[0].type === 'video' && (
              <div className="absolute top-3 right-3 bg-black/70 text-white px-2.5 py-1 rounded-md text-xs font-bold backdrop-blur-md z-10">VIDEO</div>
           )}
           {note && (
              <div className="absolute top-3 left-3 bg-yellow-400/90 text-yellow-900 p-1.5 rounded-md backdrop-blur-md shadow-sm z-10" title="Has Note">
                <StickyNote className="w-4 h-4" />
              </div>
           )}
        </div>
      </article>
    );
  }

  if (!isModal && viewMode === 'grid') {
    return (
      <article onClick={handleCardClick} className={`${cardClasses} rounded-2xl flex flex-col h-[280px] sm:h-[340px] group`}>
        <CheckboxOverlay />
        {hasMedia ? (
          <div className="h-40 sm:h-48 w-full bg-gray-100 dark:bg-gray-700 overflow-hidden relative min-h-[160px]">
            <img src={mediaUrl} alt="" className="w-full h-full object-cover" onError={(e) => handleImageError(e, 'Grid Media', mediaUrl)} />
            {tweet.media.length > 1 && <div className="absolute top-2 left-2 bg-black/60 text-white px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] sm:text-xs font-bold z-10"><Layers className="w-3 h-3" />{tweet.media.length}</div>}
            {note && <div className="absolute bottom-2 left-2 bg-yellow-400 text-yellow-900 p-1 rounded-sm shadow z-10"><StickyNote className="w-3 h-3" /></div>}
          </div>
        ) : (
          <div className="h-2 w-full bg-blue-500 transition-colors relative">
             {note && <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 p-1 rounded-sm shadow z-10"><StickyNote className="w-3 h-3" /></div>}
          </div> 
        )}
        <div className="p-3 sm:p-4 flex flex-col flex-1 pointer-events-none">
          <div className="flex items-center gap-2 mb-2">
            <img src={profileImg} alt="" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full shrink-0" onError={(e) => handleImageError(e, 'Avatar')} />
            <span className="font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-sm truncate">{tweet.name || tweet.user?.name}</span>
            {tweet.user?.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
          </div>
          <p className="text-gray-800 dark:text-gray-300 text-xs sm:text-sm line-clamp-3 sm:line-clamp-4 flex-1 min-h-0 mb-2 sm:mb-3">{tweet.full_text || tweet.text}</p>
        </div>
      </article>
    );
  }

  if (!isModal && viewMode === 'compact') {
    return (
      <article onClick={handleCardClick} className={`${cardClasses} rounded-xl p-2 sm:p-3 flex items-center gap-3 sm:gap-4 min-h-[72px]`}>
        <CheckboxOverlay />
        {hasMedia ? (
          <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg overflow-hidden relative">
            <img src={mediaUrl} alt="" className="w-full h-full object-cover" onError={(e) => handleImageError(e, 'Compact Media', mediaUrl)} />
          </div>
        ) : (
          <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
            <img src={profileImg} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full opacity-50" onError={(e) => handleImageError(e, 'Avatar')} />
          </div>
        )}
        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="flex items-center gap-1.5 sm:gap-2 truncate mb-0.5 sm:mb-1">
            <span className="font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-sm truncate">{tweet.name || tweet.user?.name}</span>
            {tweet.user?.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
            <span className="text-gray-500 text-[10px] sm:text-xs hidden sm:inline truncate">@{tweet.screen_name || tweet.user?.screen_name}</span>
            {note && <StickyNote className="w-3 h-3 text-yellow-500 shrink-0 ml-1" />}
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm truncate">{tweet.full_text || tweet.text}</p>
        </div>
      </article>
    );
  }

  // The Default Detail / Modal View
  return (
    <article onClick={!isModal ? handleCardClick : undefined} className={`${cardClasses} rounded-2xl sm:rounded-2xl`}>
      <CheckboxOverlay />
      <div className={`p-4 sm:p-5 ${isSelectionMode && !isModal ? 'pointer-events-none' : ''}`}>
        
        {/* Header */}
        <div className="flex items-center gap-2.5 sm:gap-3 mb-3">
          <img src={profileImg} alt="" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-gray-100 dark:border-gray-600 shrink-0" onError={(e) => handleImageError(e, 'Avatar')} />
          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0 sm:gap-4 pr-6 sm:pr-8">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-0 sm:gap-1.5 truncate">
              <div className="flex items-center gap-1 truncate">
                <span className="font-bold text-gray-900 dark:text-gray-100 text-[15px] sm:text-base truncate">{tweet.name || tweet.user?.name}</span>
                {tweet.user?.is_verified && <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />}
              </div>
              <span className="text-gray-500 text-xs sm:text-sm truncate">@{tweet.screen_name || tweet.user?.screen_name}</span>
            </div>
            
            <div className="flex items-center gap-2 mt-0.5 sm:mt-0">
               <a href={tweet.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 text-[11px] sm:text-xs flex items-center gap-1 transition-colors pointer-events-auto" onClick={(e) => isSelectionMode && !isModal && e.preventDefault()}>
                 <Calendar className="w-3 h-3" />{formattedDate}
               </a>
               
               {/* Graceful Degradation: Richness Badge */}
               <div 
                 className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-400 cursor-help pointer-events-auto"
                 title={tweet._is_rich ? "Rich Metadata (Contains deep creator & engagement analytics)" : "Basic Metadata (Lacks deep profile analytics)"}
               >
                 {tweet._is_rich ? <Sparkles className="w-3.5 h-3.5 text-amber-500" /> : <FileText className="w-3.5 h-3.5 text-gray-400 opacity-60" />}
               </div>

               {/* Developer Mode Toggle */}
               {isModal && (
                 <button onClick={(e) => { e.stopPropagation(); setShowRawJson(!showRawJson); }} className="ml-1 text-gray-400 hover:text-blue-500 pointer-events-auto transition-colors" title="View Raw JSON Metadata">
                     <Code className="w-4 h-4" />
                 </button>
               )}
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="text-gray-900 dark:text-gray-200 text-sm sm:text-[15px] leading-relaxed sm:leading-normal whitespace-pre-wrap break-words mb-3 font-normal" style={{ wordBreak: 'break-word' }}>
          {tweet.full_text || tweet.text}
        </div>

        {/* Multi-Media Grid */}
        {hasMedia && (
          <div className={`mt-3 mb-3 rounded-xl sm:rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-black grid gap-0.5 relative min-h-[150px] ${tweet.media.length === 1 ? 'grid-cols-1' : tweet.media.length === 2 ? 'grid-cols-2 h-40 sm:h-72' : 'grid-cols-2 h-56 sm:h-96'} ${isSelectionMode && !isModal ? 'pointer-events-none' : ''}`}>
            {isBroken && <div className="absolute inset-0 bg-red-900/40 z-10 flex items-center justify-center pointer-events-none"><HeartCrack className="w-8 h-8 text-white opacity-80" /></div>}
            {tweet.media.map((mediaItem, index) => {
              const isVideo = mediaItem.type === 'video' || mediaItem.type === 'animated_gif';
              let srcUrl = mediaItem.original || mediaItem.media_url_https || mediaItem.url || mediaItem.thumbnail;
              if (isVideo && mediaItem.video_info?.variants) {
                 const mp4Variants = mediaItem.video_info.variants.filter(v => v.content_type === 'video/mp4').sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                 if(mp4Variants.length) srcUrl = mp4Variants[0].url;
              }
              const thumbUrl = mediaItem.thumbnail || mediaItem.media_url_https || mediaItem.url;
              let containerClass = "relative flex items-center justify-center bg-gray-900 overflow-hidden w-full h-full min-h-[150px]";
              let mediaClass = `w-full ${tweet.media.length === 1 ? "object-contain max-h-[400px] sm:max-h-[500px]" : "h-full object-cover"}`;
              if (tweet.media.length >= 3 && index === 0) containerClass += " row-span-2";

              return (
                <div key={index} className={containerClass}>
                  {isVideo ? <video controls poster={thumbUrl} className={mediaClass} preload="none" playsInline><source src={srcUrl} type="video/mp4" /></video>
                           : <img src={srcUrl} alt="" className={`${mediaClass} ${!(isSelectionMode && !isModal) ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`} onClick={(e) => { if(!(isSelectionMode && !isModal) && !isBroken) { e.stopPropagation(); handleMediaClick(tweet.media, index); }}} onError={(e) => handleImageError(e, 'Detail View Media', srcUrl)} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Robust Quoted Tweet Parsing and Display */}
        {(() => {
          const candidates = [
            tweet.quoted_tweet, tweet.metadata?.quoted_status_result?.result,
            tweet.metadata?.quoted_status_result, tweet.quoted_status_result?.result,
            tweet.quoted_status_result, tweet.metadata?.legacy?.quoted_status_result?.result,
            tweet.legacy?.quoted_status_result?.result, tweet.legacy?.quoted_status_result,
            tweet.quoted, tweet.quote, tweet.quotedStatus, tweet.quoted_status_data,
            tweet.tweet?.quoted_status_result?.result, tweet.tweet?.quoted_status_result
          ];
          
          if (typeof tweet.quoted_status === 'object' && tweet.quoted_status !== null) {
              candidates.push(tweet.quoted_status);
          }

          let qResult = null;
          let qLegacy = null;
          let qText = '';
          let qMedia = [];

          for (let candidate of candidates) {
             if (candidate && typeof candidate === 'object') {
                 let unwrapped = candidate;
                 if (unwrapped.__typename === 'TweetWithVisibilityResults' || unwrapped.tweet) {
                     unwrapped = unwrapped.tweet || unwrapped;
                 }
                 
                 const legacy = unwrapped.legacy || unwrapped;
                 
                 let text = legacy.full_text || legacy.text || unwrapped.full_text || unwrapped.text || '';
                 if (legacy.note_tweet?.note_tweet_results?.result?.text) text = legacy.note_tweet.note_tweet_results.result.text;
                 else if (unwrapped.note_tweet?.note_tweet_results?.result?.text) text = unwrapped.note_tweet.note_tweet_results.result.text;
                 
                 let media = [];
                 if (Array.isArray(unwrapped.media)) media = unwrapped.media;
                 else if (Array.isArray(legacy.extended_entities?.media)) media = legacy.extended_entities.media;
                 else if (Array.isArray(unwrapped.extended_entities?.media)) media = unwrapped.extended_entities.media;
                 else if (Array.isArray(legacy.entities?.media)) media = legacy.entities.media;
                 else if (Array.isArray(unwrapped.entities?.media)) media = unwrapped.entities.media;
                 else if (Array.isArray(legacy.media)) media = legacy.media;
                 
                 if (text || media.length > 0) {
                     qResult = unwrapped;
                     qLegacy = legacy;
                     qText = text;
                     qMedia = media;
                     break;
                 }
             }
          }

          if (!qResult) return null; 

          const userBase = qResult.core?.user_results?.result 
                        || qResult.user 
                        || qLegacy.user 
                        || qResult.author
                        || qLegacy.author
                        || {};
          
          const qName = userBase.core?.name || userBase.legacy?.name || userBase.name || 'Unknown';
          const qHandle = userBase.core?.screen_name || userBase.legacy?.screen_name || userBase.screen_name || 'unknown';
          const qAvatar = userBase.avatar?.image_url
                       || userBase.legacy?.profile_image_url_https 
                       || userBase.core?.profile_image_url_https
                       || userBase.profile_image_url_https 
                       || userBase.legacy?.profile_image_url
                       || userBase.core?.profile_image_url
                       || userBase.profile_image_url
                       || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
          
          const qVerified = userBase.is_verified || 
                            userBase.core?.user_results?.result?.is_blue_verified || 
                            userBase.legacy?.verified || 
                            userBase.verification_info?.is_blue_verified || 
                            false;

          const hasQMedia = qMedia.length > 0;
          
          return (
            <div 
              className={`mt-3 border border-gray-200 dark:border-gray-700 rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors flex flex-col gap-2 ${!(isSelectionMode && !isModal) ? 'cursor-pointer' : ''}`}
              onClick={(e) => {
                if (!(isSelectionMode && !isModal)) e.stopPropagation(); 
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5 sm:mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <img src={qAvatar} alt="Quoted user" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover border border-gray-100 dark:border-gray-600 shrink-0" onError={(e) => handleImageError(e, 'Quote Avatar', qAvatar)} />
                  <span className="font-bold text-[13px] sm:text-sm text-gray-800 dark:text-gray-200 truncate">{qName}</span>
                  {qVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                  <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm truncate">@{qHandle}</span>
                </div>
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm whitespace-pre-wrap break-words line-clamp-4 sm:line-clamp-6">
                {qText}
              </p>

              {hasQMedia && (
                <div className={`mt-1 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-black grid gap-0.5 ${
                  qMedia.length === 1 ? 'grid-cols-1' :
                  qMedia.length === 2 ? 'grid-cols-2 h-24 sm:h-40' :
                  'grid-cols-2 h-36 sm:h-64'
                }`}>
                  {qMedia.slice(0, 4).map((m, idx) => {
                     const isVideo = m.type === 'video' || m.type === 'animated_gif';
                     const thumbUrl = m.thumbnail || m.media_url_https || m.url;
                     
                     let qItemClass = "relative bg-gray-900 flex items-center justify-center overflow-hidden w-full h-full";
                     if (qMedia.length === 3 && idx === 0) qItemClass += " row-span-2";
                     
                     return (
                       <div key={idx} className={qItemClass}>
                          {isVideo ? (
                            <>
                              <img 
                                src={thumbUrl} 
                                alt="Quoted video thumbnail" 
                                className={`w-full h-full object-cover opacity-60 ${!(isSelectionMode && !isModal) ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`} 
                                
                                onClick={(e) => {
                                  if (isSelectionMode && !isModal) return;
                                  e.stopPropagation();
                                  handleMediaClick(qMedia, idx);
                                }}
                                onError={(e) => handleImageError(e, 'Quote Video Thumb', thumbUrl)}
                              />
                              <div className="absolute bg-black/60 text-white px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold pointer-events-none backdrop-blur-sm">VIDEO</div>
                            </>
                          ) : (
                            <img 
                              src={thumbUrl} 
                              alt="Quoted media" 
                              className={`w-full h-full object-cover ${!(isSelectionMode && !isModal) ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`} 
                              
                              onClick={(e) => {
                                if (isSelectionMode && !isModal) return;
                                e.stopPropagation();
                                handleMediaClick(qMedia, idx);
                              }}
                              onError={(e) => handleImageError(e, 'Quote Image', thumbUrl)}
                            />
                          )}
                       </div>
                     )
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Private Annotations / Notes Module */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 pointer-events-auto">
          {isEditingNote ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-xl border border-yellow-200 dark:border-yellow-700/50">
               <div className="flex items-center gap-2 mb-2 text-yellow-800 dark:text-yellow-500 text-sm font-bold">
                 <StickyNote className="w-4 h-4" /> Editing Note
               </div>
               <textarea 
                  autoFocus
                  value={localNoteText}
                  onChange={(e) => setLocalNoteText(e.target.value)}
                  placeholder="Why did you save this bookmark?..."
                  className="w-full bg-white dark:bg-gray-800 border border-yellow-300 dark:border-yellow-700/50 rounded-lg p-2.5 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none resize-y min-h-[80px]"
               />
               <div className="flex justify-end gap-2 mt-2">
                 <button onClick={() => { setLocalNoteText(note || ""); setIsEditingNote(false); }} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
                 <button onClick={handleSaveNote} className="px-3 py-1.5 text-xs font-medium bg-yellow-400 text-yellow-900 hover:bg-yellow-500 rounded-lg shadow-sm transition-colors">Save Note</button>
               </div>
            </div>
          ) : note ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-xl border border-yellow-200 dark:border-yellow-700/50 group flex justify-between items-start gap-4">
               <div>
                 <div className="flex items-center gap-2 mb-1.5 text-yellow-800 dark:text-yellow-500 text-xs font-bold uppercase tracking-wider">
                   <StickyNote className="w-3.5 h-3.5" /> My Note
                 </div>
                 <p className="text-sm text-gray-800 dark:text-gray-300 whitespace-pre-wrap">{note}</p>
               </div>
               <button onClick={() => setIsEditingNote(true)} className="p-1.5 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-200 dark:hover:bg-yellow-800/50 rounded-md opacity-0 group-hover:opacity-100 transition-all"><Edit2 className="w-4 h-4" /></button>
            </div>
          ) : (
            <button onClick={() => setIsEditingNote(true)} className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-500 transition-colors">
               <StickyNote className="w-4 h-4" /> + Add private note
            </button>
          )}
        </div>

        {/* Engagement Metrics */}
        <div className="flex items-center justify-between text-gray-400 dark:text-gray-500 text-xs sm:text-sm mt-3 pt-3 w-full pointer-events-none">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 w-full">
            <div className="flex items-center gap-1.5" title="Replies"><MessageCircle className="w-4 h-4" /><span>{formatNum(tweet.metrics?.reply_count ?? tweet.reply_count ?? 0)}</span></div>
            <div className="flex items-center gap-1.5" title="Retweets"><Repeat2 className="w-4 h-4" /><span>{formatNum(tweet.metrics?.retweet_count ?? tweet.retweet_count ?? 0)}</span></div>
            <div className="flex items-center gap-1.5" title="Likes"><Heart className="w-4 h-4" /><span>{formatNum(tweet.metrics?.favorite_count ?? tweet.favorite_count ?? 0)}</span></div>
            
            {/* Extended Metrics Only Visible in the Large Modal Popup */}
            {isModal && (
              <>
                <div className="flex items-center gap-1.5" title="Bookmarks"><Bookmark className="w-4 h-4" /><span>{formatNum(tweet.metrics?.bookmark_count ?? tweet.bookmark_count ?? 0)}</span></div>
                <div className="flex items-center gap-1.5" title="Quotes"><Quote className="w-4 h-4" /><span>{formatNum(tweet.metrics?.quote_count ?? tweet.quote_count ?? 0)}</span></div>
                <div className="flex items-center gap-1.5 ml-auto" title="Views"><TrendingUp className="w-4 h-4" /><span>{formatNum(tweet.metrics?.views_count ?? tweet.views_count ?? parseInt(tweet.views?.count) ?? 0)}</span></div>
              </>
            )}

            {/* In Standard Feed view, keep Views on the far right as a visual anchor */}
            {!isModal && (
                <div className="flex items-center gap-1.5 ml-auto" title="Views"><TrendingUp className="w-4 h-4" /><span>{formatNum(tweet.metrics?.views_count ?? tweet.views_count ?? parseInt(tweet.views?.count) ?? 0)}</span></div>
            )}
          </div>
        </div>

        {/* Developer Mode Raw JSON Viewer (Modal Only) */}
        {showRawJson && isModal && (
          <div className="mt-6 p-4 bg-gray-900 text-emerald-400 rounded-xl overflow-x-auto text-xs font-mono border border-gray-700 shadow-inner pointer-events-auto max-h-96 custom-scrollbar">
              <pre>{JSON.stringify(tweet, null, 2)}</pre>
          </div>
        )}
      </div>
    </article>
  );
}

export default React.memo(TweetCard, (prev, next) => {
  const prevId = prev.tweet.id || prev.tweet.id_str || prev.tweet.rest_id;
  const nextId = next.tweet.id || next.tweet.id_str || next.tweet.rest_id;
  return prevId === nextId && prev.isModal === next.isModal;
});