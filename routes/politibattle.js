'use strict';

const express = require('express');
const router = express.Router();
const POLITICIANS = require('../lib/politiData');

// GET roster (public, for lobby preview)
router.get('/roster', (req, res) => {
  res.json(POLITICIANS.map(p => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    types: p.types,
    title: p.title,
    stats: p.stats,
    moves: p.moves.map(m => ({
      name: m.name, type: m.type, category: m.category,
      power: m.power, accuracy: m.accuracy, description: m.description,
    })),
    flavor: p.flavor,
  })));
});

// GET type chart
router.get('/types', (req, res) => {
  const TYPES = [
    'Republican', 'Democrat', 'Libertarian', 'Green', 'Socialist',
    'Authoritarian', 'Centrist', 'Populist', 'Corporate', 'Revolutionary'
  ];

  const TYPE_CHART = {
    Republican:    { Democrat: 2, Green: 2, Socialist: 2, Libertarian: 0.5, Authoritarian: 0.5, Corporate: 0.5 },
    Democrat:      { Republican: 0.5, Libertarian: 2, Corporate: 2, Populist: 2, Green: 0.5, Socialist: 0.5 },
    Libertarian:   { Authoritarian: 2, Socialist: 2, Corporate: 0.5, Republican: 0.5, Centrist: 2 },
    Green:         { Corporate: 2, Republican: 0.5, Populist: 2, Democrat: 0.5 },
    Socialist:     { Corporate: 2, Libertarian: 0.5, Populist: 2, Republican: 0.5, Revolutionary: 0.5 },
    Authoritarian: { Revolutionary: 2, Libertarian: 0, Democrat: 2, Green: 2, Populist: 0.5 },
    Centrist:      { Populist: 0.5, Revolutionary: 0.5, Authoritarian: 2, Libertarian: 0.5 },
    Populist:      { Corporate: 2, Centrist: 2, Authoritarian: 0.5, Democrat: 0.5 },
    Corporate:     { Socialist: 2, Green: 0.5, Populist: 0.5, Revolutionary: 0.5, Libertarian: 2 },
    Revolutionary: { Authoritarian: 0, Corporate: 2, Centrist: 2, Socialist: 0.5, Republican: 2 },
  };

  res.json({ types: TYPES, chart: TYPE_CHART });
});

router.get('/arena', (req, res) => {
  res.sendFile('arena.html', { root: './public' });
});

module.exports = router;
