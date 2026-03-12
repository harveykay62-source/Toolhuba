const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address' });

    const existing = db.get('SELECT id FROM users WHERE email=?', [email.toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const colors = ['#6366f1','#f43f5e','#10b981','#f59e0b','#3b82f6','#8b5cf6'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const result = db.run(
      `INSERT INTO users (uuid,email,password,name,avatar_color) VALUES (?,?,?,?,?)`,
      [userId, email.toLowerCase(), hashedPassword, name, avatarColor]
    );

    const today = new Date().toISOString().split('T')[0];
    db.run(`INSERT INTO daily_stats (date,new_users) VALUES (?,1) ON CONFLICT(date) DO UPDATE SET new_users=new_users+1`,[today]);

    req.session.userId = result.lastInsertRowid;
    req.session.email = email.toLowerCase();
    req.session.name = name;
    req.session.role = 'free';
    req.session.avatarColor = avatarColor;

    res.json({ success: true, message: 'Account created!', redirect: '/dashboard' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = db.get('SELECT * FROM users WHERE email=?', [email.toLowerCase()]);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    let role = user.role;
    if (role === 'premium' && user.premium_expires_at) {
      if (new Date(user.premium_expires_at) < new Date()) {
        role = 'free';
        db.run('UPDATE users SET role=? WHERE id=?', ['free', user.id]);
      }
    }

    db.run(`UPDATE users SET last_login=datetime('now') WHERE id=?`, [user.id]);

    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.name = user.name;
    req.session.role = role;
    req.session.avatarColor = user.avatar_color;

    const redirect = role === 'admin' ? '/admin' : '/dashboard';
    res.json({ success: true, redirect });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, redirect: '/' });
});

router.get('/me', (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true, name: req.session.name, email: req.session.email, role: req.session.role, avatarColor: req.session.avatarColor });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = router;
