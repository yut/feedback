const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

// Parse URL-encoded bodies (from HTML forms)
app.use(express.urlencoded());

// Parse JSON bodies (from API clients)
app.use(express.json());

app.get('/', (req, res) => {
  res.send('GET request to root')
});

app.get('/climate.png', (req, res) => {
  console.log(`\n>> GET /climate.png; query parameters: ${JSON.stringify(req.query)}`);
  res.sendFile("/home/yut/node/climate.png");
});

app.post('/climate.png', (req, res) => {
  console.log(`\n>> POST /climate.png; request body: ${JSON.stringify(req.body)}`);
  res.sendFile("/home/yut/node/climate.png");
});

app.listen(80, () => console.log('Climate Mojo Express server is listening on port 80.'));
