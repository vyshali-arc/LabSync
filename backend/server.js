const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Helper: read data
function readData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

// Helper: write data
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET /api/subjects – Returns all subjects with programs
app.get('/api/subjects', (req, res) => {
  const data = readData();
  res.json(data.subjects);
});

// GET /api/progress/:name – Returns student progress
app.get('/api/progress/:name', (req, res) => {
  const data = readData();
  const name = req.params.name.trim().toLowerCase();
  const student = data.students[name] || {};
  res.json(student);
});

// POST /api/progress – Save student progress for a subject
app.post('/api/progress', (req, res) => {
  const { name, subject, completedPrograms } = req.body;
  if (!name || !subject || !Array.isArray(completedPrograms)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const data = readData();
  const key = name.trim().toLowerCase();

  if (!data.students[key]) {
    data.students[key] = {};
  }

  data.students[key][subject] = {
    completedPrograms,
    lastUpdated: new Date().toISOString()
  };

  writeData(data);
  res.json({ success: true });
});

// Fallback route for SPA (Express v5 compatible)
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 LabSync Server running at http://localhost:${PORT}\n`);
});
