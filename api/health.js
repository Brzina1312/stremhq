// api/health.js
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    providers: ['vidsrc', 'godrive', 'autoembed', 'tmdbembed']
  });
};