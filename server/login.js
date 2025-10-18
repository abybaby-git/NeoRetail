const express = require('express');
const router = express.Router();
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'savari_girigiri'; // Move to .env in production

// Utility function to normalize IP address
const getNormalizedIP = (req) => {
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress || 
             req.ip || 
             'unknown';
  
  // Convert IPv6 loopback to IPv4 format
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  
  // Remove IPv6 prefix if present
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  
  return ip;
};

router.post('/', async (req, res) => {
  const { username, password } = req.body;
  
  // Get normalized IP address
  const ipAddress = getNormalizedIP(req);
  
  // Debug: Log the detected IP address
  // console.log('Detected IP address:', ipAddress);

  try {
    // Step 1: Fetch user info
    const result = await pool.query(
      `SELECT uc.user_id, uc.password_hash, u.name, u.role, u.status, u.store_id
       FROM user_credentials uc
       JOIN users u ON uc.user_id = u.id
       WHERE uc.username = $1`,
      [username]
    );

    // Step 2: Handle user not found
    if (!result || result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const userId = user.user_id;

    // Step 2: Check user status (skip for admin users)
    if (user.role.toLowerCase() !== 'admin' && user.status !== 'active') {
      return res.status(403).json({ 
        message: 'Account disabled. Please contact administrator.' 
      });
    }

    // Step 3: Check login attempts
    const attemptRes = await pool.query(
      `SELECT attempts, time FROM login_attempts WHERE user_id = $1`,
      [userId]
    );

    const now = new Date();

    // Check if attempts need to be reset (after 5 minutes)
    if (attemptRes.rows.length > 0) {
      const attempt = attemptRes.rows[0];
      const lastAttempt = new Date(attempt.time);
      const diffMins = (now - lastAttempt) / (1000 * 60);
      
      // Reset attempts after 5 minutes
      if (diffMins >= 5) {
        await pool.query(`DELETE FROM login_attempts WHERE user_id = $1`, [userId]);
      } else if (attempt.attempts >= 5) {
        // Block login if attempts >= 5 and less than 5 minutes have passed
        const unlockTime = new Date(lastAttempt.getTime() + (5 * 60 * 1000)); // Add 5 minutes
        const unlockTimeString = unlockTime.toLocaleTimeString();
        const remainingMinutes = Math.ceil((unlockTime - now) / (1000 * 60));
        
        return res.status(403).json({
          message: `Account blocked due to multiple failed attempts. Please try again after ${unlockTimeString} (${remainingMinutes} minutes remaining).`,
          unlockTime: unlockTimeString,
          remainingMinutes: remainingMinutes,
          blockedUntil: unlockTime.toISOString()
        });
      }
    }

    // Step 4: Check password (only if not blocked by attempts)
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      // Insert or update login_attempts
      if (attemptRes.rows.length > 0) {
        await pool.query(
          `UPDATE login_attempts
           SET attempts = attempts + 1, time = $2, ip_address = $3
           WHERE user_id = $1`,
          [userId, now, ipAddress]
        );
      } else {
        await pool.query(
          `INSERT INTO login_attempts (user_id, attempts, time, ip_address)
           VALUES ($1, 1, $2, $3)`,
          [userId, now, ipAddress]
        );
      }

      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Step 5: Login successful — clear login_attempts
    await pool.query(`DELETE FROM login_attempts WHERE user_id = $1`, [userId]);

    // Step 6: Generate JWT
    const token = jwt.sign(
      {
        user_id: user.user_id,
        name: user.name,
        role: user.role,
        store_id: user.store_id,
      },
      JWT_SECRET,
      { expiresIn: '8h' } // 8 hours for admin sessions
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        role: user.role,
        store_id: user.store_id,
      },
    });

  } catch (err) {
    console.error('Login error:', err);
    
    // Provide more specific error messages based on error type
    if (err.code === '23505') { // Unique constraint violation
      return res.status(400).json({ message: 'Username already exists' });
    } else if (err.code === '23503') { // Foreign key constraint violation
      return res.status(400).json({ message: 'Invalid user reference' });
    } else if (err.code === '42P01') { // Table doesn't exist
      return res.status(500).json({ message: 'Database configuration error' });
    } else if (err.code === '42703') { // Column doesn't exist
      return res.status(500).json({ message: 'Database schema error' });
    } else if (err.message && err.message.includes('password')) {
      return res.status(500).json({ message: 'Password verification error' });
    } else {
      return res.status(500).json({ 
        message: 'Server error occurred during login',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
});

module.exports = router;
