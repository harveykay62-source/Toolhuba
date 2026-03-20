/**
 * ToolHub — Auth Routes
 * - Standard register/login/logout
 * - Google OAuth (via google-auth-library ID token verify)
 * - Auto student role for approved school domains
 * - Admin: assign roles, create teachers, manage users
 */
'use strict';

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

const EDU_SUFFIXES = ['.edu','.sch','.ac.uk','.ac.nz','.ac.za','.ac.jp','.ac.kr','.edu.au','.edu.sg','.edu.my','.school','.k12'];
function isEducatorEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase();
  return EDU_SUFFIXES.some(s => lower.endsWith(s));
}

async function checkApprovedDomain(email) {
  if (!email) return false;
  const domain = email.toLowerCase().split('@')[1];
  if (!domain) return false;
  const row = await db.get(`SELECT id FROM school_domains WHERE domain = $1`, [domain]);
  return !!row;
}

async function resolveRole(email, existingRole) {
  if (existingRole && !['free'].includes(existingRole)) return existingRole;
  const isApproved = await checkApprovedDomain(email);
  if (isApproved) return 'student';
  if (isEducatorEmail(email)) return 'educator';
  return 'free';
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address' });

    const existing = await db.get('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const colors = ['#6366f1','#f43f5e','#10b981','#f59e0b','#3b82f6','#8b5cf6'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const role = await resolveRole(email);
    const isStudent = role === 'student';

    await db.run(
      `INSERT INTO users (uuid,email,password,name,avatar_color,role,is_student) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [userId, email.toLowerCase(), hashedPassword, name, avatarColor, role, isStudent]
    );
    const user = await db.get('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);

    const today = new Date().toISOString().split('T')[0];
    await db.run(
      `INSERT INTO daily_stats (date,new_users) VALUES ($1,1) ON CONFLICT(date) DO UPDATE SET new_users=daily_stats.new_users+1`,
      [today]
    );

    req.session.userId = user.id;
    req.session.email = email.toLowerCase();
    req.session.name = name;
    req.session.role = role;
    req.session.avatarColor = avatarColor;
    req.session.isVerifiedEducator = isEducatorEmail(email) || role === 'educator';
    req.session.isStudent = isStudent;

    const msg = isStudent ? 'Student account created!' : (isEducatorEmail(email) ? 'Educator account created!' : 'Account created!');
    res.json({ success: true, message: msg, redirect: '/dashboard' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await db.get('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    let role = user.role;
    if (role === 'premium' && user.premium_expires_at) {
      if (new Date(user.premium_expires_at) < new Date()) {
        role = 'free';
        await db.run('UPDATE users SET role=$1 WHERE id=$2', ['free', user.id]);
      }
    }

    await db.run('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);

    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.name = user.name;
    req.session.role = role;
    req.session.avatarColor = user.avatar_color;
    req.session.isVerifiedEducator = isEducatorEmail(user.email) || ['educator','teacher'].includes(role);
    req.session.isStudent = user.is_student || role === 'student';
    req.session.isTeacher = user.is_teacher || role === 'teacher';

    const redirect = role === 'admin' ? '/admin' : (role === 'teacher' ? '/teacher' : '/dashboard');
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
    res.json({
      loggedIn: true, name: req.session.name, email: req.session.email,
      role: req.session.role, avatarColor: req.session.avatarColor,
      isVerifiedEducator: req.session.isVerifiedEducator || false,
      isStudent: req.session.isStudent || false,
      isTeacher: req.session.isTeacher || false,
    });
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
    await db.run('UPDATE users SET password=$1 WHERE id=$2', [hash, req.session.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Password change failed.' });
  }
});

router.post('/google-login', async (req, res) => {
  try {
    const { credential, email, name, googleId } = req.body;

    let verifiedEmail = email;
    let verifiedName  = name;

    if (credential && process.env.GOOGLE_CLIENT_ID) {
      try {
        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        verifiedEmail = payload.email;
        verifiedName  = payload.name || payload.given_name || verifiedEmail.split('@')[0];
      } catch (verifyErr) {
        console.error('Google token verify failed:', verifyErr.message);
        return res.status(401).json({ error: 'Invalid Google token' });
      }
    }

    if (!verifiedEmail) return res.status(400).json({ error: 'Google login data missing' });

    let user = await db.get('SELECT * FROM users WHERE email=$1', [verifiedEmail.toLowerCase()]);

    if (!user) {
      const newUuid = uuidv4();
      const colors  = ['#6366f1','#f43f5e','#10b981','#f59e0b','#3b82f6','#8b5cf6'];
      const avatarColor = colors[Math.floor(Math.random() * colors.length)];
      const role    = await resolveRole(verifiedEmail);
      const isStudent = role === 'student';
      const hash    = await bcrypt.hash(uuidv4(), 10);

      await db.run(
        `INSERT INTO users (uuid,email,password,name,avatar_color,role,is_student,google_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [newUuid, verifiedEmail.toLowerCase(), hash, verifiedName, avatarColor, role, isStudent, googleId || null]
      );

      const today = new Date().toISOString().split('T')[0];
      await db.run(
        `INSERT INTO daily_stats (date,new_users) VALUES ($1,1) ON CONFLICT(date) DO UPDATE SET new_users=daily_stats.new_users+1`,
        [today]
      );

      user = await db.get('SELECT * FROM users WHERE email=$1', [verifiedEmail.toLowerCase()]);
    } else {
      await db.run('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);
      if (user.role === 'free') {
        const betterRole = await resolveRole(user.email, user.role);
        if (betterRole !== user.role) {
          await db.run('UPDATE users SET role=$1, is_student=$2 WHERE id=$3',
            [betterRole, betterRole === 'student', user.id]);
          user.role = betterRole;
          user.is_student = betterRole === 'student';
        }
      }
    }

    req.session.userId = user.id;
    req.session.email  = user.email;
    req.session.name   = user.name;
    req.session.role   = user.role;
    req.session.avatarColor = user.avatar_color;
    req.session.isVerifiedEducator = isEducatorEmail(user.email) || ['educator','teacher'].includes(user.role);
    req.session.isStudent = user.is_student || user.role === 'student';
    req.session.isTeacher = user.is_teacher || user.role === 'teacher';

    const redirect = user.role === 'admin' ? '/admin' : (user.role === 'teacher' ? '/teacher' : '/dashboard');
    res.json({ success: true, redirect });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ error: 'Google login failed.' });
  }
});

router.post('/admin/assign-role', async (req, res) => {
  if (!req.session.userId || req.session.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { userId, newRole } = req.body;
  if (!userId || !newRole) return res.status(400).json({ error: 'Missing userId or newRole' });
  const valid = ['free','premium','educator','admin','teacher','student'];
  if (!valid.includes(newRole)) return res.status(400).json({ error: 'Invalid role' });
  try {
    await db.run('UPDATE users SET role=$1, is_student=$2, is_teacher=$3 WHERE id=$4',
      [newRole, newRole==='student', newRole==='teacher', userId]);
    res.json({ success: true, message: `Role updated to ${newRole}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.get('/admin/users', async (req, res) => {
  if (!req.session.userId || req.session.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  try {
    const users = await db.all(
      `SELECT id,name,email,role,avatar_color,is_active,is_student,is_teacher,created_at,last_login FROM users ORDER BY created_at DESC LIMIT 200`
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/admin/toggle-user', async (req, res) => {
  if (!req.session.userId || req.session.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { userId, active } = req.body;
  try {
    await db.run('UPDATE users SET is_active=$1 WHERE id=$2', [active ? 1 : 0, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle user' });
  }
});

router.post('/admin/toggle-ads', async (req, res) => {
  if (!req.session.userId || req.session.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { userId, hideAds } = req.body;
  try {
    await db.run('UPDATE users SET is_student=$1 WHERE id=$2', [hideAds ? true : false, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
