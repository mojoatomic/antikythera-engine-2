const express = require('express');
const cors = require('cors');
const AntikytheraEngine = require('./engine');

const app = express();
const engine = new AntikytheraEngine();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Get current state
app.get('/api/state', (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const state = engine.getState(date);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get state for a specific date
app.get('/api/state/:date', (req, res) => {
  try {
    const date = new Date(req.params.date);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    const state = engine.getState(date);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get just sun position
app.get('/api/sun', (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const state = engine.getState(date);
    res.json(state.sun);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get just moon position
app.get('/api/moon', (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const state = engine.getState(date);
    res.json(state.moon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get planetary positions
app.get('/api/planets', (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const state = engine.getState(date);
    res.json(state.planets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Antikythera Engine API running on http://localhost:${PORT}`);
  console.log(`Try: http://localhost:${PORT}/api/state`);
});
