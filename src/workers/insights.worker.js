// Filename: src/workers/insights.worker.js

/**
 * PHASE 4/7: Background MapReduce Engine (Decoupled & Flat)
 * Offloads complex data aggregation to prevent UI stuttering.
 * Strictly consumes the flat schema from normalizer.js to prevent volatility bugs.
 */
self.onmessage = (e) => {
    const { bookmarks } = e.data;
    
    if (!bookmarks || bookmarks.length === 0) {
        self.postMessage({ type: 'done', payload: null });
        return;
    }

    const creatorTallies = {};
    const hashtagTallies = {};
    const sourceTallies = {};
    const langTallies = {};
    const profileLangTallies = {}; 
    const locationTallies = {};
    const categoryTallies = {};
    
    let viralTweets = [];
    let ratioedTweets = [];
    let fastReactions = [];
    let longevityAccounts = [];
    let powerUsers = [];
    let followerRatios = [];
    let oldestBookmarks = [];
    
    let totalUsersAnalyzed = 0;
    let verifiedCount = 0;
    let unverifiedCount = 0;

    // Single-pass O(N) aggregation loop over NORMALIZED flat schemas
    bookmarks.forEach(b => {
      // Deconstruct directly from our normalized schema (no more deeply nested raw checks)
      const { user, metrics, tags, source, lang, is_quote, quoted_tweet, created_at } = b;

      // 1. Tweet Level Metrics
      const engagement = metrics.views_count + metrics.favorite_count + metrics.retweet_count;
      viralTweets.push({ tweet: b, engagement });

      if (metrics.favorite_count > 0 && metrics.quote_count > 0) {
        ratioedTweets.push({ tweet: b, ratio: metrics.quote_count / metrics.favorite_count, quotes: metrics.quote_count, likes: metrics.favorite_count });
      }

      if (created_at) {
          oldestBookmarks.push(b);
      }

      // 2. User Level Metrics (deduplicated by handle)
      const handle = user.screen_name;
      const name = user.name;
      const avatar = user.profile_image_url;
      
      if (handle) {
        creatorTallies[handle] = creatorTallies[handle] || { name, count: 0, avatar, is_verified: user.is_verified };
        creatorTallies[handle].count++;
        
        // Execute heavy extraction ONLY on the first time we see this user to avoid duplicating profile stats
        if (creatorTallies[handle].count === 1) {
          totalUsersAnalyzed++;
          
          if (user.is_verified) verifiedCount++;
          else unverifiedCount++;

          if (user.location && user.location.trim().length > 1) {
             locationTallies[user.location] = (locationTallies[user.location] || 0) + 1;
          }

          if (user.profile_language && user.profile_language !== 'und') {
             profileLangTallies[user.profile_language] = (profileLangTallies[user.profile_language] || 0) + 1;
          }

          if (user.professional_category) {
             categoryTallies[user.professional_category] = (categoryTallies[user.professional_category] || 0) + 1;
          }

          if (user.created_at) {
             longevityAccounts.push({ handle, name, avatar, created_at: new Date(user.created_at) });
          }

          if (user.statuses_count && user.created_at) {
             const ageDays = Math.max(1, (new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24));
             const tpDay = user.statuses_count / ageDays;
             powerUsers.push({ handle, name, avatar, tpDay, total: user.statuses_count });
          }

          if (user.followers_count) {
             const friends = Math.max(1, user.friends_count || 1);
             const ratio = user.followers_count / friends;
             followerRatios.push({ handle, name, avatar, ratio, followers: user.followers_count, following: friends });
          }
        }
      }

      // 3. Ecosystem Metrics
      if (Array.isArray(tags)) {
        tags.forEach(tag => {
            const lowerTag = tag.toLowerCase();
            hashtagTallies[lowerTag] = (hashtagTallies[lowerTag] || 0) + 1;
        });
      }

      if (source && source !== 'Unknown') {
        sourceTallies[source] = (sourceTallies[source] || 0) + 1;
      }

      if (lang && lang !== 'und' && lang !== 'qme' && lang !== 'zxx') {
        langTallies[lang] = (langTallies[lang] || 0) + 1;
      }

      // 4. Reaction Latency Metrics
      if (is_quote && quoted_tweet && created_at && quoted_tweet.created_at) {
         const mainTime = new Date(created_at).getTime();
         const quoteTime = new Date(quoted_tweet.created_at).getTime();
         const diffMins = (mainTime - quoteTime) / (1000 * 60);
         if (diffMins > 0) {
             fastReactions.push({ tweet: b, diffMins, quotedHandle: quoted_tweet.user.screen_name || 'unknown' });
         }
      }
    });

    const sortObject = (obj, limit = 5) => Object.entries(obj).sort((a, b) => b[1] - (a[1].count || a[1])).slice(0, limit);

    const payload = {
      topCreators: Object.entries(creatorTallies).sort((a, b) => b[1].count - a[1].count).slice(0, 10),
      topTags: sortObject(hashtagTallies, 15),
      topSources: sortObject(sourceTallies, 6),
      topLangs: sortObject(langTallies, 6),
      topProfileLangs: sortObject(profileLangTallies, 6),
      topLocations: sortObject(locationTallies, 50),
      topCategories: sortObject(categoryTallies, 8),
      
      top10Viral: viralTweets.sort((a,b) => b.engagement - a.engagement).slice(0, 10).map(i => i.tweet),
      topRatioed: ratioedTweets.sort((a,b) => b.ratio - a.ratio).slice(0, 5),
      topReactions: fastReactions.sort((a,b) => a.diffMins - b.diffMins).slice(0, 5),
      oldestBookmarks: oldestBookmarks.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(0, 5),
      oldestAccounts: longevityAccounts.sort((a,b) => a.created_at.getTime() - b.created_at.getTime()).slice(0, 5),
      powerUsers: powerUsers.sort((a,b) => b.tpDay - a.tpDay).slice(0, 5),
      topInfluencers: followerRatios.sort((a,b) => b.ratio - a.ratio).slice(0, 5),
      
      stats: { totalUsersAnalyzed },
      verificationStats: { verified: verifiedCount, unverified: unverifiedCount }
    };
    
    self.postMessage({ type: 'done', payload });
};