const { serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');

// Create the addon
const builder = serveHTTP((addon) => {
  // Define the addon manifest
  addon.defineManifest({
    id: 'community.hqstreams.aggregator',
    version: '1.0.0',
    name: 'HQ Streams Aggregator',
    description: 'Aggregates high-quality (1080p+) streaming links from multiple providers',
    logo: 'https://i.imgur.com/3XwJQ5l.png',
    background: 'https://i.imgur.com/8fGhJ9a.png',
    type: 'stream',
    catalogs: [],
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt', 'tmdb:']
  });

  // Define the stream handler
  addon.defineStreamHandler(async (args) => {
    const { type, id } = args;
    const streams = [];
    
    console.log(`Request received for ${type} with ID: ${id}`);
    
    if (!type || !id) {
      return [];
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
            title: `VidSrc - 1080p`,
            url: vidsrcUrl,
            description: `Source: VidSrc\nQuality: 1080p\nFeatures: subtitles, auto_update`,
            behaviorHints: {
              notWebReady: false,
              bingeGroup: 'VidSrc'
            }
          });
        } catch (error) {
          console.error('VidSrc error:', error.message);
        }
        
        // Fetch from GoDrivePlayer for series
        try {
          const godriveUrl = `${providers.godrive.seriesUrl}?tmdb=${tmdbId || imdbId}&season=${season}&episode=${episode}`;
          
          streams.push({
            name: 'GoDrivePlayer',
            title: `GoDrivePlayer - 1080p`,
            url: godriveUrl,
            description: `Source: GoDrivePlayer\nQuality: 1080p\nFeatures: fast_servers, responsive`,
            behaviorHints: {
              notWebReady: false,
              bingeGroup: 'GoDrivePlayer'
            }
          });
        } catch (error) {
          console.error('GoDrivePlayer error:', error.message);
        }
        
        // Fetch from AutoEmbed for series
        try {
          const autoembedUrl = `${providers.autoembed.seriesUrl}/${imdbId}/${season}/${episode}`;
          
          streams.push({
            name: 'AutoEmbed',
            title: `AutoEmbed - 1080p`,
            url: autoembedUrl,
            description: `Source: AutoEmbed\nQuality: 1080p\nFeatures: free_api`,
            behaviorHints: {
              notWebReady: false,
              bingeGroup: 'AutoEmbed'
            }
          });
        } catch (error) {
          console.error('AutoEmbed error:', error.message);
        }
        
        // Fetch from TMDB-Embed-API for series
        try {
          const tmdbembedUrl = `${providers.tmdbembed.seriesUrl}/${tmdbId || imdbId}/${season}/${episode}`;
          
          streams.push({
            name: 'TMDB-Embed',
            title: `TMDB-Embed - 4K`,
            url: tmdbembedUrl,
            description: `Source: TMDB-Embed\nQuality: 4K\nFeatures: multi_source`,
            behaviorHints: {
              notWebReady: false,
              bingeGroup: 'TMDB-Embed'
            }
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
            title: `VidSrc - 1080p`,
            url: vidsrcUrl,
            description: `Source: VidSrc\nQuality: 1080p\nFeatures: subtitles, auto_update`,
            behaviorHints: {
              notWebReady: false,
              bingeGroup: 'VidSrc'
            }
          });
        } catch (error) {
          console.error('VidSrc error:', error.message);
        }
        
        // Fetch from GoDrivePlayer
        try {
          const godriveUrl = type === 'movie'
            ? `${providers.godrive.movieUrl}?imdb=${imdbId}`
            : `${providers.godrive.seriesUrl}?tmdb=${imdbId}&season=1&episode=1`;
        
          streams.push({
            name: 'GoDrivePlayer',
            title: `GoDrivePlayer - 1080p`,
            url: godriveUrl,
            description: `Source: GoDrivePlayer\nQuality: 1080p\nFeatures: fast_servers, responsive`,
            behaviorHints: {
              notWebReady: false,
              bingeGroup: 'GoDrivePlayer'
            }
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
            title: `AutoEmbed - 1080p`,
            url: autoembedUrl,
            description: `Source: AutoEmbed\nQuality: 1080p\nFeatures: free_api`,
            behaviorHints: {
              notWebReady: false,
              bingeGroup: 'AutoEmbed'
            }
          });
        } catch (error) {
          console.error('AutoEmbed error:', error.message);
        }
        
        // Fetch from TMDB-Embed-API
        try {
          const tmdbembedUrl = type === 'movie'
            ? `${providers.tmdbembed.movieUrl}/${imdbId || imdbId}`
            : `${providers.tmdbembed.seriesUrl}/${tmdbId || imdbId}`;
        
          streams.push({
            name: 'TMDB-Embed',
            title: `TMDB-Embed - 4K`,
            url: tmdbembedUrl,
            description: `Source: TMDB-Embed\nQuality: 4K\nFeatures: multi_source`,
            behaviorHints: {
              notWebReady: false,
              bingeGroup: 'TMDB-Embed'
            }
          });
        } catch (error) {
          console.error('TMDB-Embed error:', error.message);
        }
      }
    
    console.log(`Returning ${streams.length} streams`);
    return streams;
    
  } catch (error) {
    console.error('General error:', error);
    return [];
  }
  });

// Start the addon
builder.run();