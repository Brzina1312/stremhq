const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Provider configurations
const providers = {
  vidsrc: {
    movieUrl: 'https://vidsrc.to/embed/movie',
    seriesUrl: 'https://vidsrc.to/embed/tv',
    quality: ['1080p', '4K'],
    features: ['subtitles', 'auto_update'],
    urlFormat: 'embed'
  },
  godrive: {
    movieUrl: 'https://godriveplayer.com/player.php',
    seriesUrl: 'https://godriveplayer.com/player.php',
    quality: ['1080p'],
    features: ['fast_servers', 'responsive'],
    urlFormat: 'player'
  },
  autoembed: {
    movieUrl: 'https://autoembed.cc/embed/movie',
    seriesUrl: 'https://autoembed.cc/embed/tv',
    quality: ['1080p', '4K'],
    features: ['free_api'],
    urlFormat: 'embed'
  },
  tmdbembed: {
    movieUrl: 'https://api.tmdbembed.org/embed/movie',
    seriesUrl: 'https://api.tmdbembed.org/embed/tv',
    quality: ['1080p', '4K'],
    features: ['multi_source'],
    urlFormat: 'embed'
  }
};

// Helper function to enrich stream info
function enrichStreamInfo(stream, providerName, sourceUrl) {
  return {
    name: `${providerName} - ${stream.quality || 'HD'}`,
    title: stream.title || `${providerName} Stream`,
    url: stream.url || sourceUrl,
    description: `Source: ${providerName}\nQuality: ${stream.quality || 'HD'}\nFeatures: ${stream.features?.join(', ') || 'Standard'}`,
    behaviorHints: {
      notWebReady: false,
      bingeGroup: providerName,
      proxyHeaders: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
      }
    },
    externalUrl: stream.url || sourceUrl,
    subtitles: stream.subtitles || [],
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
    }
  };
}

// Routes
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    providers: ['vidsrc', 'godrive', 'autoembed', 'tmdbembed']
  });
});

app.get('/test', (req, res) => {
  res.json({
    message: 'Test route',
    timestamp: new Date().toISOString(),
    providers: Object.keys(providers)
  });
});

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Query:', req.query);
  console.log('Params:', req.params);
  next();
});

// Update the route to match what Stremio is sending
app.get('/stream/:type/:id.json', async (req, res) => {
  const { type, id } = req.params;
  const streams = [];
  
  console.log(`Request received for ${type} with ID: ${id}`);
  
  if (!type || !id) {
    return res.status(400).json({ error: 'Missing type or id parameter' });
  }

  try {
    // Handle different ID formats
    let imdbId = id;
    let tmdbId = null;
    let season = null;
    let episode = null;
    
    if (id.startsWith('tmdb:')) {
      tmdbId = id.replace('tmdb:', '');
    } else if (id.includes(':')) {
      // This is a series with season and episode
      const parts = id.split(':');
      imdbId = parts[0];
      season = parts[1];
      episode = parts[2];
    }
    
    // For series, we need to handle season and episode
    if (type === 'series' && season && episode) {
      console.log(`Processing series: ${imdbId}, Season: ${season}, Episode: ${episode}`);
      
      // Fetch from VidSrc for series
      try {
        const vidsrcUrl = `${providers.vidsrc.seriesUrl}/${imdbId}/${season}/${episode}`;
        
        streams.push({
          name: 'VidSrc',
          title: `VidSrc - ${providers.vidsrc.quality[0]}`,
          url: vidsrcUrl,
          description: `Source: VidSrc\nQuality: ${providers.vidsrc.quality[0]}\nFeatures: ${providers.vidsrc.features.join(', ')}`,
          behaviorHints: {
            notWebReady: false,
            bingeGroup: 'VidSrc',
            proxyHeaders: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
            }
          },
          externalUrl: vidsrcUrl,
          subtitles: providers.vidsrc.features.includes('subtitles') ? [] : null
        });
      } catch (error) {
        console.error('VidSrc error:', error.message);
      }
      
      // Fetch from GoDrivePlayer for series
      try {
        const godriveUrl = `${providers.godrive.seriesUrl}?tmdb=${tmdbId || imdbId}&season=${season}&episode=${episode}`;
        
        streams.push({
          name: 'GoDrivePlayer',
          title: `GoDrivePlayer - ${providers.godrive.quality[0]}`,
          url: godriveUrl,
          description: `Source: GoDrivePlayer\nQuality: ${providers.godrive.quality[0]}\nFeatures: ${providers.godrive.features.join(', ')}`,
          behaviorHints: {
            notWebReady: false,
            bingeGroup: 'GoDrivePlayer',
            proxyHeaders: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
            }
          },
          externalUrl: godriveUrl,
          subtitles: providers.godrive.features.includes('subtitles') ? [] : null
        });
      } catch (error) {
        console.error('GoDrivePlayer error:', error.message);
      }
      
      // Fetch from AutoEmbed for series
      try {
        const autoembedUrl = `${providers.autoembed.seriesUrl}/${imdbId}/${season}/${episode}`;
        
        streams.push({
          name: 'AutoEmbed',
          title: `AutoEmbed - ${providers.autoembed.quality[0]}`,
          url: autoembedUrl,
          description: `Source: AutoEmbed\nQuality: ${providers.autoembed.quality[0]}\nFeatures: ${providers.autoembed.features.join(', ')}`,
          behaviorHints: {
            notWebReady: false,
            bingeGroup: 'AutoEmbed',
            proxyHeaders: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
            }
          },
          externalUrl: autoembedUrl,
          subtitles: providers.autoembed.features.includes('subtitles') ? [] : null
        });
      } catch (error) {
        console.error('AutoEmbed error:', error.message);
      }
      
      // Fetch from TMDB-Embed-API for series
      try {
        const tmdbembedUrl = `${providers.tmdbembed.seriesUrl}/${tmdbId || imdbId}/${season}/${episode}`;
        
        streams.push({
          name: 'TMDB-Embed',
          title: `TMDB-Embed - ${providers.tmdbembed.quality[1]}`, // Use 4K quality
          url: tmdbembedUrl,
          description: `Source: TMDB-Embed\nQuality: ${providers.tmdbembed.quality[1]}\nFeatures: ${providers.tmdbembed.features.join(', ')}`,
          behaviorHints: {
            notWebReady: false,
            bingeGroup: 'TMDB-Embed',
            proxyHeaders: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
            }
          },
          externalUrl: tmdbembedUrl,
          subtitles: providers.tmdbembed.features.includes('subtitles') ? [] : null
        });
      } catch (error) {
        console.error('TMDB-Embed error:', error.message);
      }
    } else {
      // Handle movies or series without specific season/episode
      console.log(`Processing movie or series without specific episode: ${imdbId}`);
      
      // Fetch from VidSrc
      try {
        const vidsrcUrl = type === 'movie' 
          ? `${providers.vidsrc.movieUrl}/${imdbId}`
          : `${providers.vidsrc.seriesUrl}/${imdbId}`;
        
        streams.push({
          name: 'VidSrc',
          title: `VidSrc - ${providers.vidsrc.quality[0]}`,
          url: vidsrcUrl,
          description: `Source: VidSrc\nQuality: ${providers.vidsrc.quality[0]}\nFeatures: ${providers.vidsrc.features.join(', ')}`,
          behaviorHints: {
            notWebReady: false,
            bingeGroup: 'VidSrc',
            proxyHeaders: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
            }
          },
          externalUrl: vidsrcUrl,
          subtitles: providers.vidsrc.features.includes('subtitles') ? [] : null
        });
      } catch (error) {
        console.error('VidSrc error:', error.message);
      }
      
      // Fetch from GoDrivePlayer
      try {
        const godriveUrl = type === 'movie'
          ? `${providers.godrive.movieUrl}?imdb=${imdbId}`
          : `${providers.godrive.seriesUrl}?tmdb=${tmdbId || imdbId}&season=1&episode=1`;
        
        streams.push({
          name: 'GoDrivePlayer',
          title: `GoDrivePlayer - ${providers.godrive.quality[0]}`,
          url: godriveUrl,
          description: `Source: GoDrivePlayer\nQuality: ${providers.godrive.quality[0]}\nFeatures: ${providers.godrive.features.join(', ')}`,
          behaviorHints: {
            notWebReady: false,
            bingeGroup: 'GoDrivePlayer',
            proxyHeaders: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
            }
          },
          externalUrl: godriveUrl,
          subtitles: providers.godrive.features.includes('subtitles') ? [] : null
        });
      } catch (error) {
        console.error('GoDrivePlayer error:', error.message);
      }
      
      // Fetch from AutoEmbed
      try {
        const autoembedUrl = type === 'movie'
          ? `${providers.autoembed.movieUrl}/${imdbId}`
          : `${providers.autoembed.seriesUrl}/${imdbId}`;
        
        streams.push({
          name: 'AutoEmbed',
          title: `AutoEmbed - ${providers.autoembed.quality[0]}`,
          url: autoembedUrl,
          description: `Source: AutoEmbed\nQuality: ${providers.autoembed.quality[0]}\nFeatures: ${providers.autoembed.features.join(', ')}`,
          behaviorHints: {
            notWebReady: false,
            bingeGroup: 'AutoEmbed',
            proxyHeaders: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
            }
          },
          externalUrl: autoembedUrl,
          subtitles: providers.autoembed.features.includes('subtitles') ? [] : null
        });
      } catch (error) {
        console.error('AutoEmbed error:', error.message);
      }
      
      // Fetch from TMDB-Embed-API
      try {
        const tmdbembedUrl = type === 'movie'
          ? `${providers.tmdbembed.movieUrl}/${tmdbId || imdbId}`
          : `${providers.tmdbembed.seriesUrl}/${tmdbId || imdbId}`;
        
        streams.push({
          name: 'TMDB-Embed',
          title: `TMDB-Embed - ${providers.tmdbembed.quality[1]}`, // Use 4K quality
          url: tmdbembedUrl,
          description: `Source: TMDB-Embed\nQuality: ${providers.tmdbembed.quality[1]}\nFeatures: ${providers.tmdbembed.features.join(', ')}`,
          behaviorHints: {
            notWebReady: false,
            bingeGroup: 'TMDB-Embed',
            proxyHeaders: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
            }
          },
          externalUrl: tmdbembedUrl,
          subtitles: providers.tmdbembed.features.includes('subtitles') ? [] : null
        });
      } catch (error) {
        console.error('TMDB-Embed error:', error.message);
      }
    }
    
    // Filter only high-quality streams
    const hqStreams = streams.filter(stream => 
      stream.title.includes('1080p') || 
      stream.title.includes('4K')
    );
    
    console.log(`Returning ${hqStreams.length} high-quality streams`);
    res.status(200).json({ streams: hqStreams });
    
  } catch (error) {
    console.error('General error:', error);
    res.status(500).json({ streams: [] });
  }
});

// Keep the old route for backward compatibility
app.get('/:type/:id/streams.json', async (req, res) => {
  // Redirect to the new route
  res.redirect(`/stream/${req.params.type}/${req.params.id}.json`);
});

// Export for Vercel
module.exports = app;