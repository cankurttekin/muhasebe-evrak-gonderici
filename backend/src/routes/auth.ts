import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { dbService, verifyPassword, hashPassword } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Kullanıcı adı ve parola zorunludur.'
      });
    }

    const user = dbService.getUserByUsername(username);
    if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({
        success: false,
        error: 'Kullanıcı adı veya parola hatalı.'
      });
    }

    // Generate random session token
    const token = crypto.randomBytes(32).toString('hex');
    // Session valid for 14 days
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    dbService.createSession(user.id, token, expiresAt);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : (req.query.token as string);
    if (token) {
      dbService.deleteSession(token);
    }
    res.json({ success: true, message: 'Başarıyla çıkış yapıldı.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    user: req.user
  });
});

// POST /api/auth/change-password
authRouter.post('/change-password', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Mevcut parola ve yeni parola zorunludur.'
      });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Yeni parola en az 4 karakter olmalıdır.'
      });
    }

    const fullUser = dbService.getUserById(req.user!.id);
    if (!fullUser || !verifyPassword(currentPassword, fullUser.password_hash)) {
      return res.status(400).json({
        success: false,
        error: 'Mevcut parolanız hatalı.'
      });
    }

    const newHash = hashPassword(newPassword);
    dbService.updateUser(req.user!.id, { passwordHash: newHash });

    res.json({ success: true, message: 'Parola başarıyla güncellendi.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
