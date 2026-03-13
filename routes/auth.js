const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

// ── Educator email domain detection ──────────────────────────────────────────
const EDU_SUFFIXES = ['.edu','.sch','.ac.uk','.ac.nz','.ac.za','.ac.jp','.ac.kr','.edu.au','.edu.sg','.edu.my','.school','.k12'];
function isEducatorEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase();
  return EDU_SUFFIXES.some(s => lower.endsWith(s));
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address' });

    const existing = await db.get('SELECT id FROM users WHERE email=?', [email.toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const colors = ['#6366f1','#f43f5e','#10b981','#f59e0b','#3b82f6','#8b5cf6'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    // Auto-detect educator email
    const isVerified = isEducatorEmail(email);
    const role = isVerified ? 'educator' : 'free';

    const result = await db.run(
      `INSERT INTO users (uuid,email,password,name,avatar_color,role) VALUES (?,?,?,?,?,?)`,
      [userId, email.toLowerCase(), hashedPassword, name, avatarColor, role]
    );

    const today = new Date().toISOString().split('T')[0];
    await db.run(
      `INSERT INTO daily_stats (date,new_users) VALUES (?,1) ON CONFLICT(date) DO UPDATE SET new_users=daily_stats.new_users+1`,
      [today]
    );

    req.session.userId = result.lastInsertRowid;
    req.session.email = email.toLowerCase();
    req.session.name = name;
    req.session.role = role;
    req.session.avatarColor = avatarColor;
    req.session.isVerifiedEducator = isVerified;

    res.json({ success: true, message: isVerified ? 'Educator account created!' : 'Account created!', redirect: '/dashboard' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await db.get('SELECT * FROM users WHERE email=?', [email.toLowerCase()]);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    let role = user.role;
    if (role === 'premium' && user.premium_expires_at) {
      if (new Date(user.premium_expires_at) < new Date()) {
        role = 'free';
        await db.run('UPDATE users SET role=? WHERE id=?', ['free', user.id]);
      }
    }

    await db.run('UPDATE users SET last_login=NOW() WHERE id=?', [user.id]);

    const isVerified = isEducatorEmail(user.email);
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.name = user.name;
    req.session.role = role;
    req.session.avatarColor = user.avatar_color;
    req.session.isVerifiedEducator = isVerified || role === 'educator';

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
    res.json({ loggedIn: true, name: req.session.name, email: req.session.email, role: req.session.role,
      avatarColor: req.session.avatarColor, isVerifiedEducator: req.session.isVerifiedEducator || false });
  } else {
    res.json({ loggedIn: false });
  }
});

router.post('/change-password', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const hash = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password=? WHERE id=?', [hash, req.session.userId]);
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: 'Password change failed.' });
  }
});

// ── Google Login (simulated OAuth — in production use passport-google-oauth20) ──
router.post('/google-login', async (req, res) => {
  try {
    const { email, name, googleId } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'Google login data missing' });

    let user = await db.get('SELECT * FROM users WHERE email=?', [email.toLowerCase()]);

    if (!user) {
      // Auto-register
      const userId = uuidv4();
      const colors = ['#6366f1','#f43f5e','#10b981','#f59e0b','#3b82f6','#8b5cf6'];
      const avatarColor = colors[Math.floor(Math.random() * colors.length)];
      const isVerified = isEducatorEmail(email);
      const role = isVerified ? 'educator' : 'free';
      const hash = await bcrypt.hash(uuidv4(), 10); // random pw for google users

      const result = await db.run(
        `INSERT INTO users (uuid,email,password,name,avatar_color,role) VALUES (?,?,?,?,?,?)`,
        [userId, email.toLowerCase(), hash, name, avatarColor, role]
      );
      user = { id: result.lastInsertRowid, email: email.toLowerCase(), name, role, avatar_color: avatarColor };
    }

    const isVerified = isEducatorEmail(user.email) || user.role === 'educator';
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.name = user.name;
    req.session.role = user.role;
    req.session.avatarColor = user.avatar_color;
    req.session.isVerifiedEducator = isVerified;

    res.json({ success: true, redirect: user.role === 'admin' ? '/admin' : '/dashboard' });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ error: 'Google login failed.' });
  }
});

// ── Admin: Assign role ───────────────────────────────────────────────────────
router.post('/admin/assign-role', async (req, res) => {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { userId, newRole } = req.body;
  if (!userId || !newRole) return res.status(400).json({ error: 'Missing userId or newRole' });
  if (!['free','premium','educator','admin'].includes(newRole)) return res.status(400).json({ error: 'Invalid role' });

  try {
    await db.run('UPDATE users SET role=? WHERE id=?', [newRole, userId]);
    res.json({ success: true, message: `Role updated to ${newRole}` });
  } catch(err) {
    console.error('Assign role error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// ── Admin: List users ────────────────────────────────────────────────────────
router.get('/admin/users', async (req, res) => {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const users = await db.all('SELECT id, name, email, role, avatar_color, is_active, created_at, last_login FROM users ORDER BY created_at DESC LIMIT 200');
    res.json({ users });
  } catch(err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ── Admin: Toggle user active ────────────────────────────────────────────────
router.post('/admin/toggle-user', async (req, res) => {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { userId, active } = req.body;
  try {
    await db.run('UPDATE users SET is_active=? WHERE id=?', [active ? 1 : 0, userId]);
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: 'Failed to toggle user' });
  }
});

module.exports = router;
