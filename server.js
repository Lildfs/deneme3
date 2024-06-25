const http = require('http');
const url = require('url');
const queryString = require('querystring');

const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 8080;

const cors_proxy = require('./lib/cors-anywhere');

// Middleware to log incoming requests
function logRequest(req, res, next) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
}

const server = http.createServer((req, res) => {
  // Parse the request URL
  const requestUrl = url.parse(req.url);

  // Apply middleware to log all requests
  logRequest(req, res, () => {
    // Handle POST requests to '/dorf1.php'
    if (req.method === 'POST' && requestUrl.pathname === '/dorf1.php') {
      handlePostRequest(req, res);
    } else {
      // Handle other requests or send 404
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found\n');
    }
  });
});

// Function to handle POST requests to '/dorf1.php'
function handlePostRequest(req, res) {
  let requestBody = '';

  req.on('data', function(data) {
    requestBody += data;
  });

  req.on('end', function() {
    // Parse POST request body
    const postData = queryString.parse(requestBody);

    // Log the received POST data (optional)
    console.log('Received POST data:', postData);

    // Forward POST request to the actual endpoint ('https://vip7.ttwars.com/dorf1.php')
    let options = {
      hostname: 'vip7.ttwars.com',
      path: '/dorf1.php',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    // Make the request
    let proxyReq = http.request(options, function(proxyRes) {
      // Forward the response from the actual endpoint to the client
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    // Handle errors
    proxyReq.on('error', function(err) {
      console.error('Proxy request failed:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error\n');
    });

    // Write request body data to the actual request
    proxyReq.write(requestBody);
    proxyReq.end();
  });
}

// Start the CORS Anywhere server
cors_proxy.createServer({
  originBlacklist: originBlacklist,
  originWhitelist: originWhitelist,
  requireHeader: ['origin', 'x-requested-with'],
  checkRateLimit: checkRateLimit,
  removeHeaders: [
    'cookie',
    'cookie2',
    // Strip Heroku-specific headers
    'x-request-start',
    'x-request-id',
    'via',
    'connect-time',
    'total-route-time',
    // Other Heroku added debug headers
    // 'x-forwarded-for',
    // 'x-forwarded-proto',
    // 'x-forwarded-port',
  ],
  redirectSameOrigin: true,
  httpProxyOptions: {
    // Do not add X-Forwarded-For, etc. headers, because Heroku already adds it.
    xfwd: false,
  },
}).listen(port, host, function() {
  console.log(`Running CORS Anywhere on ${host}:${port}`);
});
