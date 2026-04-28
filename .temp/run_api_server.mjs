import app from '../api/index.js';

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Local API proxy running on http://localhost:${PORT}`);
});
