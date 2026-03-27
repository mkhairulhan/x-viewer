// Filename: src/hooks/useAnalytics.js

import { useMemo } from 'react';

/**
 * Custom hook to process and calculate insights from the bookmarks array.
 * Memoized to prevent recalculation unless the bookmarks array changes.
 */
export const useAnalytics = (bookmarks) => {
  return useMemo(() => {
    if (!bookmarks || bookmarks.length === 0) return null;

    const creatorTallies = {};
    const hashtagTallies = {};
    const sourceTallies = {};
    const langTallies = {};
    const profileLangTallies = {}; // NEW: Profile language metric
    const locationTallies = {};
    const categoryTallies = {};
    
    let viralTweets = [];
    let ratioedTweets = [];
    let fastReactions = [];
    let longevityAccounts = [];
    let powerUsers = [];
    let followerRatios = [];
    
    let totalUsersAnalyzed = 0;

    bookmarks.forEach(b => {
      const unwrapped = b.tweet || b;
      const metadata = unwrapped.metadata || {};
      const legacy = unwrapped.legacy || metadata.legacy || unwrapped;
      
      const coreUser = unwrapped.core?.user_results?.result || metadata.core?.user_results?.result || unwrapped.user || {};
      const userLegacy = coreUser.legacy || coreUser || {};
      const professional = coreUser.professional || {};

      const views = parseInt(unwrapped.views?.count || unwrapped.views_count || legacy.views_count || 0) || 0;
      const likes = parseInt(unwrapped.favorite_count || legacy.favorite_count || 0) || 0;
      const rts = parseInt(unwrapped.retweet_count || legacy.retweet_count || 0) || 0;
      const quotes = parseInt(unwrapped.quote_count || legacy.quote_count || 0) || 0;
      
      const engagement = views + likes + rts;
      viralTweets.push({ tweet: unwrapped, engagement });

      if (likes > 0 && quotes > 0) {
        ratioedTweets.push({ tweet: unwrapped, ratio: quotes / likes, quotes, likes });
      }

      const handle = userLegacy.screen_name || unwrapped.screen_name;
      const name = userLegacy.name || unwrapped.name || 'Unknown';
      const avatar = userLegacy.profile_image_url_https || userLegacy.profile_image_url || unwrapped.profile_image_url;
      
      if (handle) {
        creatorTallies[handle] = creatorTallies[handle] || { name, count: 0, avatar };
        creatorTallies[handle].count++;
        
        if (creatorTallies[handle].count === 1) {
          totalUsersAnalyzed++;
          
          // Updated Location Dragnet
          const loc = coreUser.location?.location || userLegacy.location || metadata.core?.user_results?.result?.location?.location;
          if (loc && typeof loc === 'string' && loc.trim().length > 1) {
             locationTallies[loc] = (locationTallies[loc] || 0) + 1;
          }

          // Updated Created_At Dragnet
          const created_at_str = userLegacy.created_at || metadata.core?.user_results?.result?.core?.created_at || metadata.core?.user_results?.result?.legacy?.created_at;
          if (created_at_str) {
             longevityAccounts.push({ handle, name, avatar, created_at: new Date(created_at_str) });
          }

          if (userLegacy.statuses_count && created_at_str) {
             const ageDays = Math.max(1, (new Date() - new Date(created_at_str)) / (1000 * 60 * 60 * 24));
             const tpDay = userLegacy.statuses_count / ageDays;
             powerUsers.push({ handle, name, avatar, tpDay, total: userLegacy.statuses_count });
          }

          if (userLegacy.followers_count) {
             const friends = Math.max(1, userLegacy.friends_count || 1);
             const ratio = userLegacy.followers_count / friends;
             followerRatios.push({ handle, name, avatar, ratio, followers: userLegacy.followers_count, following: friends });
          }

          if (professional.category?.name) {
             const cat = professional.category.name;
             categoryTallies[cat] = (categoryTallies[cat] || 0) + 1;
          } else if (professional.professional_type) {
             const type = professional.professional_type;
             categoryTallies[type] = (categoryTallies[type] || 0) + 1;
          }
          
          // NEW: Profile Language Dragnet
          const profileLang = coreUser.profile_description_language || userLegacy.profile_description_language || metadata.core?.user_results?.result?.profile_description_language;
          if (profileLang && profileLang !== 'und') {
             profileLangTallies[profileLang] = (profileLangTallies[profileLang] || 0) + 1;
          }
        }
      }

      const text = legacy.full_text || legacy.text || unwrapped.full_text || unwrapped.text || "";
      const tags = text.match(/#[\w\u0590-\u05ff\u0600-\u06ff\u0400-\u04ff\u0900-\u097f\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]+/g) || [];
      tags.forEach(tag => {
        const lowerTag = tag.toLowerCase();
        hashtagTallies[lowerTag] = (hashtagTallies[lowerTag] || 0) + 1;
      });

      const sourceHtml = unwrapped.source || metadata.source || legacy.source;
      if (sourceHtml) {
        const sourceMatch = sourceHtml.match(/>([^<]+)<\/a>/);
        const sourceName = sourceMatch ? sourceMatch[1] : (sourceHtml.includes('Twitter') ? sourceHtml : 'Unknown');
        sourceTallies[sourceName] = (sourceTallies[sourceName] || 0) + 1;
      }

      const lang = unwrapped.lang || legacy.lang || metadata.legacy?.lang;
      if (lang && lang !== 'und' && lang !== 'qme' && lang !== 'zxx') {
        langTallies[lang] = (langTallies[lang] || 0) + 1;
      }

      const quotedTweet = unwrapped.quoted_status_result?.result || metadata.quoted_status_result?.result || unwrapped.quoted_status;
      if (quotedTweet && typeof quotedTweet === 'object') {
         const qLegacy = quotedTweet.legacy || quotedTweet;
         const qUserCore = quotedTweet.core?.user_results?.result || quotedTweet.user || {};
         const qUserLegacy = qUserCore.legacy || qUserCore;

         if (legacy.created_at && qLegacy.created_at) {
             const mainTime = new Date(legacy.created_at).getTime();
             const quoteTime = new Date(qLegacy.created_at).getTime();
             const diffMins = (mainTime - quoteTime) / (1000 * 60);
             if (diffMins > 0) {
                 fastReactions.push({ tweet: unwrapped, diffMins, quotedHandle: qUserLegacy.screen_name || 'unknown' });
             }
         }
         
         const qLoc = qUserCore.location?.location || qUserLegacy.location || metadata.core?.user_results?.result?.location?.location;
         if (qLoc && typeof qLoc === 'string' && qLoc.trim().length > 1) {
             locationTallies[qLoc] = (locationTallies[qLoc] || 0) + 1;
         }

         const qLang = quotedTweet.lang || qLegacy.lang;
         if (qLang && qLang !== 'und' && qLang !== 'qme' && qLang !== 'zxx') {
             langTallies[qLang] = (langTallies[qLang] || 0) + 1;
         }
         
         const qSourceHtml = quotedTweet.source;
         if (qSourceHtml) {
             const qSourceMatch = qSourceHtml.match(/>([^<]+)<\/a>/);
             const qSourceName = qSourceMatch ? qSourceMatch[1] : (qSourceHtml.includes('Twitter') ? qSourceHtml : 'Unknown');
             sourceTallies[qSourceName] = (sourceTallies[qSourceName] || 0) + 1;
         }
      }
    });

    const sortObject = (obj, limit = 5) => Object.entries(obj).sort((a, b) => b[1] - (a[1].count || a[1])).slice(0, limit);

    return {
      topCreators: Object.entries(creatorTallies).sort((a, b) => b[1].count - a[1].count).slice(0, 10),
      topTags: sortObject(hashtagTallies, 15),
      topSources: sortObject(sourceTallies, 6),
      topLangs: sortObject(langTallies, 6),
      topProfileLangs: sortObject(profileLangTallies, 6), // NEW Export
      topLocations: sortObject(locationTallies, 50), // Increased location limit
      topCategories: sortObject(categoryTallies, 8),
      
      top10Viral: viralTweets.sort((a,b) => b.engagement - a.engagement).slice(0, 10).map(i => i.tweet),
      topRatioed: ratioedTweets.sort((a,b) => b.ratio - a.ratio).slice(0, 5),
      topReactions: fastReactions.sort((a,b) => a.diffMins - b.diffMins).slice(0, 5),
      oldestAccounts: longevityAccounts.sort((a,b) => a.created_at.getTime() - b.created_at.getTime()).slice(0, 5),
      powerUsers: powerUsers.sort((a,b) => b.tpDay - a.tpDay).slice(0, 5),
      topInfluencers: followerRatios.sort((a,b) => b.ratio - a.ratio).slice(0, 5),
      
      stats: { totalUsersAnalyzed }
    };
  }, [bookmarks]);
};