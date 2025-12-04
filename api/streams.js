// api/streams.js
const axios = require('axios');

// Provider configurations (same as before)
const providers = {
  vidsrc: {
    movieUrl: 'https://vidsrc.to/embed/movie',
    seriesUrl: 'https://vidsrc.to/embed/tv',
    quality: ['1080p', '4K'],
    features: ['subtitles', 'auto_update']
  },
  godrive: {
    movieUrl: 'https://godriveplayer.com/player.php',
    seriesUrl: 'https://godriveplayer.com/player.php',
    quality: ['1080p'],
    features: ['fast_servers', 'responsive']
  },
  autoembed: {
    movieUrl: 'https://autoembed.cc/embed/movie',
    seriesUrl: 'https://autoembed.cc/embed/tv',
    quality: ['1080p', '4K'],
    features: ['free_api']
  },
  tmdbembed: {
    movieUrl: 'https://api.tmdbembed.org/embed/movie',
    seriesUrl: 'https://api.tmdbembed.org/embed/tv',
    quality: ['1080p', '4K'],
    features: ['multi_source']
  }
};

// Helper functions (same as before)
function enrichStreamInfo(stream, providerName, sourceUrl) {
  return {
    name: `${providerName} - ${stream.quality || 'HD'}`,
    title: stream.title || `${providerName} Stream`,
    url: stream.url || sourceUrl,
    description: `Source: ${providerName}\nQuality: ${stream.quality || 'HD'}\nFeatures: ${stream.features?.join(', ') || 'Standard'}`,
    behaviorHints: {
      notWebReady: false,
      bingeGroup: providerName
    },
    provider: {
      name: providerName,
      url: sourceUrl,
      reliability: 'high'
    },
    technicalDetails: {
      resolution: stream.quality || '1080p',
      format: stream.format || 'mp4',
      subtitles: stream.subtitles || false,
      hdr: stream.hdr || false
    }
  };
}

// The main export for Vercel
module.exports = async (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { type, id } = req.query; // Vercel passes URL params as query strings after rewrite
  const streams = [];
  
  if (!type || !id) {
    return res.status(400).json({ error: 'Missing type or id parameter' });
  }

  try {
    // Handle different ID formats
    let imdbId = id;
    let tmdbId = null;
    
    if (id.startsWith('tmdb:')) {
      tmdbId = id.replace('tmdb:', '');
      // In a real app, you'd need a way to convert TMDB to IMDb or use the TMDB ID directly
    }
    
    // Fetch from VidSrc
    try {
      const vidsrcUrl = type === 'movie' 
        ? `${providers.vidsrc.movieUrl}/${imdbId}`
        : `${providers.vidsrc.seriesUrl}/${imdbId}`;
      
      streams.push(enrichStreamInfo({
        quality: '1080p',
        features: providers.vidsrc.features
      }, 'VidSrc', vidsrcUrl));
    } catch (error) {
      console.error('VidSrc error:', error.message);
    }
    
    // Fetch from GoDrivePlayer
    try {
      const godriveUrl = type === 'movie'
        ? `${providers.godrive.movieUrl}?imdb=${imdbId}`
        : `${providers.godrive.seriesUrl}?tmdb=${tmdbId}&season=1&episode=1`; // This is a placeholder, you'd need real season/episode data
      
      streams.push(enrichStreamInfo({
        quality: '1080p',
        features: providers.godrive.features
      }, 'GoDrivePlayer', godriveUrl));
    } catch (error) {
      console.error('GoDrivePlayer error:', error.message);
    }
    
    // Fetch from AutoEmbed
    try {
      const autoembedUrl = type === 'movie'
        ? `${providers.autoembed.movieUrl}/${imdbId}`
        : `${providers.autoembed.seriesUrl}/${imdbId}`;
      
      streams.push(enrichStreamInfo({
        quality: '1080p',
        features: providers.autoembed.features
      }, 'AutoEmbed', autoembedUrl));
    } catch (error) {
      console.error('AutoEmbed error:', error.message);
    }
    
    // Fetch from TMDB-Embed-API
    try {
      const tmdbembedUrl = type === 'movie'
        ? `${providers.tmdbembed.movieUrl}/${tmdbId || imdbId}`
        : `${providers.tmdbembed.seriesUrl}/${tmdbId || imdbId}`;
      
      streams.push(enrichStreamInfo({
        quality: '4K',
        features: providers.tmdbembed.features
      }, 'TMDB-Embed', tmdbembedUrl));
    } catch (error) {
      console.error('TMDB-Embed error:', error.message);
    }
    
    // Filter only high-quality streams
    const hqStreams = streams.filter(stream => 
      stream.technicalDetails.resolution === '1080p' || 
      stream.technicalDetails.resolution === '4K'
    );
    
    res.status(200).json({ streams: hqStreams });
    
  } catch (error) {
    console.error('General error:', error);
    res.status(500).json({ streams: [] });
  }
};