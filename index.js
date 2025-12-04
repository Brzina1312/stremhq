const express = require('express');
const axios = require('axios');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// Provider configurations
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

// Quality filter function
function isHighQuality(stream) {
  const quality = stream.quality?.toLowerCase() || '';
  return quality.includes('1080p') || quality.includes('4k') || quality.includes('2160p');
}

// Stream enrichment function
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

// Main stream handler
app.get('/:type/:id/streams.json', async (req, res) => {
  const { type, id } = req.params;
  const streams = [];
  
  try {
    // Handle different ID formats
    let imdbId = id;
    let tmdbId = null;
    
    if (id.startsWith('tmdb:')) {
      tmdbId = id.replace('tmdb:', '');
      // Convert TMDB to IMDb if needed (would need API call)
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
        : `${providers.godrive.seriesUrl}?tmdb=${tmdbId}&season=1&episode=1`;
      
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
    
    res.json({ streams: hqStreams });
    
  } catch (error) {
    console.error('General error:', error);
    res.json({ streams: [] });
  }
});

// Serve manifest
app.get('/manifest.json', (req, res) => {
  res.sendFile(__dirname + '/manifest.json');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', providers: Object.keys(providers) });
});

app.listen(PORT, () => {
  console.log(`HQ Streams Aggregator running on port ${PORT}`);
});