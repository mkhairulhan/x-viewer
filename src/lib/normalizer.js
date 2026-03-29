// Filename: src/lib/normalizer.js

/**
 * High-performance helper to find the longest string from an array of possible text fields.
 * Prevents "Half-Cut" long tweets by ensuring we always grab the full essay over the 280-char summary.
 */
const getLongestString = (options) => {
    const validStrings = options.filter(t => typeof t === 'string' && t.trim().length > 0);
    if (validStrings.length === 0) return "";
    return validStrings.reduce((longest, current) => current.length > longest.length ? current : longest, "");
};

/**
 * The Universal Schema Normalizer.
 * Takes chaotic raw JSON (deep metadata or shallow exports) and forces it
 * into a predictable, flat structure so the UI never has to guess where data is.
 */
export const normalizeTweet = (raw) => {
    // If it's already passed through the normalizer, skip processing to save CPU
    if (raw._isNormalized) return raw;

    const unwrapped = raw.tweet || raw;
    const legacy = unwrapped.legacy || unwrapped.metadata?.legacy || unwrapped;
    
    // Core user objects mapped from standard Twitter API paths or shallow extension paths
    const coreUser = unwrapped.core?.user_results?.result || unwrapped.user || {};
    const userLegacy = coreUser.legacy || coreUser;

    // Graceful Degradation Heuristic: Determine if this is a "Rich" metadata export
    const isRich = Boolean(
        raw.metadata?.core || 
        unwrapped.core || 
        unwrapped.source || 
        (userLegacy && userLegacy.followers_count !== undefined)
    );

    // 1. Media Extraction Pipeline
    let media = [];
    if (Array.isArray(unwrapped.media)) media = unwrapped.media;
    else if (Array.isArray(legacy.extended_entities?.media)) media = legacy.extended_entities.media;
    else if (Array.isArray(unwrapped.extended_entities?.media)) media = unwrapped.extended_entities.media;
    else if (Array.isArray(legacy.entities?.media)) media = legacy.entities.media;
    else if (Array.isArray(unwrapped.entities?.media)) media = unwrapped.entities.media;
    else if (Array.isArray(legacy.media)) media = legacy.media;

    // Aggressive Blue Verified Dragnet (Handles X API naming changes + Extension shallow formats + Deep wrapper formats)
    const checkVerified = (uBase, uLegacy, uRoot, uMeta) => Boolean(
        uLegacy?.verified || 
        uLegacy?.is_blue_verified || 
        uBase?.is_blue_verified || 
        uBase?.ext_is_blue_verified || 
        uBase?.verification_info?.is_blue_verified || 
        uBase?.core?.user_results?.result?.is_blue_verified || 
        uBase?.core?.user_results?.result?.verification_info?.is_blue_verified ||
        uRoot?.verified ||
        uRoot?.is_blue_verified ||
        uMeta?.core?.user_results?.result?.is_blue_verified ||
        uMeta?.core?.user_results?.result?.legacy?.verified ||
        uMeta?.core?.user_results?.result?.verification_info?.is_blue_verified ||
        false
    );

    // 2. Deep Quoted Tweet Extraction
    const candidates = [
        unwrapped.metadata?.quoted_status_result?.result, unwrapped.metadata?.quoted_status_result,
        unwrapped.quoted_status_result?.result, unwrapped.quoted_status_result,
        unwrapped.metadata?.legacy?.quoted_status_result?.result, legacy.quoted_status_result?.result,
        legacy.quoted_status_result, unwrapped.quoted_tweet, unwrapped.quoted, unwrapped.quote,
        unwrapped.quotedStatus, unwrapped.quoted_status_data, unwrapped.tweet?.quoted_status_result?.result,
        unwrapped.tweet?.quoted_status_result, raw.metadata?.quoted_status_result?.result
    ];
    if (typeof unwrapped.quoted_status === 'object' && unwrapped.quoted_status !== null) candidates.push(unwrapped.quoted_status);

    let qNormalized = null;
    for (let candidate of candidates) {
        if (candidate && typeof candidate === 'object') {
            let qUnwrapped = candidate.tweet || candidate;
            let qLegacy = qUnwrapped.legacy || qUnwrapped;
            
            // X Premium Long Tweets & Extension Fallbacks (Quotes) - "Longest String Wins"
            const qTextOptions = [
                qLegacy.note_tweet?.note_tweet_results?.result?.text,
                qUnwrapped.note_tweet?.note_tweet_results?.result?.text,
                candidate.note_tweet?.note_tweet_results?.result?.text,
                qLegacy.full_text,
                qUnwrapped.full_text,
                candidate.full_text,
                qLegacy.text,
                qUnwrapped.text,
                candidate.text
            ];
            let qText = getLongestString(qTextOptions);

            let qMedia = Array.isArray(qUnwrapped.media) ? qUnwrapped.media : Array.isArray(qLegacy.extended_entities?.media) ? qLegacy.extended_entities.media : Array.isArray(qUnwrapped.extended_entities?.media) ? qUnwrapped.extended_entities.media : Array.isArray(qLegacy.entities?.media) ? qLegacy.entities.media : Array.isArray(qUnwrapped.entities?.media) ? qUnwrapped.entities.media : Array.isArray(qLegacy.media) ? qLegacy.media : [];

            if (qText || qMedia.length > 0) {
                const qUserBase = qUnwrapped.core?.user_results?.result || qUnwrapped.user || qLegacy.user || qUnwrapped.author || qLegacy.author || {};
                const qUserLegacy = qUserBase.legacy || qUserBase;
                
                qNormalized = {
                    text: qText,
                    media: qMedia,
                    created_at: qLegacy.created_at || qUnwrapped.created_at || null,
                    user: {
                        name: qUserBase.core?.name || qUserBase.legacy?.name || qUserBase.name || 'Unknown',
                        screen_name: qUserBase.core?.screen_name || qUserBase.legacy?.screen_name || qUserBase.screen_name || 'unknown',
                        profile_image_url: qUserBase.avatar?.image_url || qUserBase.legacy?.profile_image_url_https || qUserBase.core?.profile_image_url_https || qUserBase.profile_image_url_https || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png',
                        is_verified: checkVerified(qUserBase, qUserLegacy, qUnwrapped, candidate.metadata),
                    },
                    possibly_sensitive: qUnwrapped.possibly_sensitive || qLegacy.possibly_sensitive || false
                };
                break;
            }
        }
    }

    // 3. Metadata Extraction
    const screen_name = (userLegacy.screen_name || unwrapped.screen_name || raw.metadata?.core?.user_results?.result?.legacy?.screen_name || 'unknown').toLowerCase();
    const id = unwrapped.id || unwrapped.id_str || unwrapped.rest_id || raw.metadata?.rest_id;
    
    // X Premium Long Tweets & Extension Fallbacks (Main Tweets) - "Longest String Wins"
    const textOptions = [
        legacy.note_tweet?.note_tweet_results?.result?.text,
        unwrapped.note_tweet?.note_tweet_results?.result?.text,
        raw.note_tweet?.note_tweet_results?.result?.text,
        raw.metadata?.note_tweet?.note_tweet_results?.result?.text,
        legacy.full_text,
        unwrapped.full_text,
        raw.full_text,
        legacy.text,
        unwrapped.text,
        raw.text
    ];
    let text = getLongestString(textOptions);
    
    const tagsMatch = text.match(/#[\w\u0590-\u05ff\u0600-\u06ff\u0400-\u04ff\u0900-\u097f\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]+/g) || [];
    const tags = tagsMatch.map(t => t.toLowerCase());

    const sourceHtml = unwrapped.source || unwrapped.metadata?.source || legacy.source || raw.metadata?.source;
    let sourceName = 'Unknown';
    if (sourceHtml) {
        const sourceMatch = sourceHtml.match(/>([^<]+)<\/a>/);
        sourceName = sourceMatch ? sourceMatch[1] : (sourceHtml.includes('Twitter') ? sourceHtml : 'Unknown');
    }

    // Advanced Data Extraction: Professional Category (Safely handle object vs array)
    let profCategory = null;
    const proData = coreUser.professional || raw.metadata?.core?.user_results?.result?.professional;
    if (proData) {
        if (Array.isArray(proData.category) && proData.category.length > 0) {
            profCategory = proData.category[0].name;
        } else if (proData.category?.name) {
            profCategory = proData.category.name;
        } else if (proData.professional_type) {
            profCategory = proData.professional_type;
        }
    }

    // Advanced Data Extraction: Profile Language
    const profileLanguage = coreUser.profile_description_language || 
                            userLegacy.profile_description_language || 
                            raw.metadata?.core?.user_results?.result?.legacy?.profile_description_language || 
                            raw.metadata?.core?.user_results?.result?.profile_description_language || null;

    // 4. Return The Universal Schema Object
    return {
        _isNormalized: true,
        _is_rich: isRich, 
        _last_updated: Date.now(), 
        
        id: id,
        created_at: legacy.created_at || unwrapped.created_at || raw.created_at || raw.metadata?.core?.user_results?.result?.legacy?.created_at || new Date().toISOString(),
        full_text: text,
        tags: tags,
        source: sourceName,
        lang: unwrapped.lang || legacy.lang || unwrapped.metadata?.legacy?.lang || raw.lang || "und",
        url: unwrapped.url || `https://twitter.com/${screen_name}/status/${id}`,
        possibly_sensitive: unwrapped.possibly_sensitive || legacy.possibly_sensitive || false,
        is_quote: !!(unwrapped.quoted_status_result || legacy.quoted_status_result || unwrapped.quoted_status || raw.metadata?.quoted_status_result || qNormalized),
        is_reply: !!(legacy.in_reply_to_status_id_str || unwrapped.in_reply_to_status_id_str || raw.in_reply_to_status_id_str),
        
        custom_notes: raw.custom_notes || null,
        custom_tags: Array.isArray(raw.custom_tags) ? raw.custom_tags : [],
        
        user: {
            name: userLegacy.name || unwrapped.name || raw.name || raw.metadata?.core?.user_results?.result?.legacy?.name || 'Unknown',
            screen_name: screen_name,
            profile_image_url: userLegacy.profile_image_url_https || userLegacy.profile_image_url || unwrapped.profile_image_url || raw.profile_image_url || raw.metadata?.core?.user_results?.result?.legacy?.profile_image_url_https || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png',
            is_verified: checkVerified(coreUser, userLegacy, unwrapped, raw.metadata),
            
            location: coreUser.location?.location || userLegacy.location || unwrapped.location || raw.location || raw.metadata?.core?.user_results?.result?.location?.location || raw.metadata?.core?.user_results?.result?.legacy?.location || "",
            profile_language: profileLanguage,
            followers_count: parseInt(userLegacy.followers_count || unwrapped.followers_count || unwrapped.user_followers_count || raw.metadata?.core?.user_results?.result?.legacy?.followers_count || 0) || 0,
            friends_count: Math.max(1, parseInt(userLegacy.friends_count || unwrapped.friends_count || unwrapped.user_friends_count || raw.metadata?.core?.user_results?.result?.legacy?.friends_count || 1) || 1), 
            statuses_count: parseInt(userLegacy.statuses_count || unwrapped.statuses_count || unwrapped.user_statuses_count || raw.metadata?.core?.user_results?.result?.legacy?.statuses_count || 0) || 0,
            created_at: userLegacy.created_at || unwrapped.user_created_at || raw.user_created_at || raw.metadata?.core?.user_results?.result?.core?.created_at || raw.metadata?.core?.user_results?.result?.legacy?.created_at || null,
            professional_category: profCategory
        },
        
        metrics: {
            favorite_count: parseInt(unwrapped.favorite_count || legacy.favorite_count || raw.favorite_count || 0) || 0,
            retweet_count: parseInt(unwrapped.retweet_count || legacy.retweet_count || raw.retweet_count || 0) || 0,
            reply_count: parseInt(unwrapped.reply_count || legacy.reply_count || raw.reply_count || 0) || 0,
            views_count: parseInt(unwrapped.views?.count || unwrapped.views_count || legacy.views_count || raw.metadata?.views?.count || raw.views_count || 0) || 0,
            quote_count: parseInt(unwrapped.quote_count || legacy.quote_count || raw.quote_count || 0) || 0,
            bookmark_count: parseInt(unwrapped.bookmark_count || legacy.bookmark_count || raw.bookmark_count || raw.metadata?.bookmark_count || 0) || 0,
        },
        
        media: media,
        quoted_tweet: qNormalized
    };
};