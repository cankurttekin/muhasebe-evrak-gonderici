import { Router, Response } from 'express';
import { dbService, hashPassword, UserRole } from '../db.js';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';

export const usersRouter = Router();

// All user routes require authentication and ADMIN role
usersRouter.use(requireAuth);
usersRouter.use(requireAdmin);

// GET /api/users - List all users
usersRouter.get('/', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const users = dbService.getAllUsers();
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/users - Create new user
usersRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, password, name, role = 'USER' } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Kullanıcı adı, parola ve isim alanları zorunludur.'
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Kullanıcı adı en az 3 karakter olmalıdır.'
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Parola en az 4 karakter olmalıdır.'
      });
    }

    const existing = dbService.getUserByUsername(cleanUsername);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Bu kullanıcı adı zaten kullanılmaktadır.'
      });
    }

    const validRole: UserRole = role === 'ADMIN' ? 'ADMIN' : 'USER';
    const passHash = hashPassword(password);
    const newId = dbService.createUser(cleanUsername, passHash, name, validRole);

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu.',
      user: {
        id: newId,
        username: cleanUsername,
        name: name.trim(),
        role: validRole,
        is_active: 1
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/users/:id - Update user details
usersRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name, role, is_active } = req.body;

    const user = dbService.getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });
    }

    // Safety: Admin cannot deactivate or demote themselves
    if (req.user!.id === id) {
      if (is_active === 0 || is_active === false) {
        return res.status(400).json({
          success: false,
          error: 'Kendi hesabınızı pasife alamazsınız.'
        });
      }
      if (role && role !== 'ADMIN') {
        return res.status(400).json({
          success: false,
          error: 'Kendi yönetici rolünüzü kaldıramazsınız.'
        });
      }
    }

    const validRole: UserRole | undefined = role ? (role === 'ADMIN' ? 'ADMIN' : 'USER') : undefined;
    dbService.updateUser(id, {
      name,
      role: validRole,
      is_active: is_active !== undefined ? (is_active ? 1 : 0) : undefined
    });

    res.json({ success: true, message: 'Kullanıcı bilgileri güncellendi.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/users/:id/reset-password - Reset another user's password
usersRouter.post('/:id/reset-password', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Yeni parola en az 4 karakter olmalıdır.'
      });
    }

    const user = dbService.getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });
    }

    const passHash = hashPassword(newPassword);
    dbService.updateUser(id, { passwordHash: passHash });

    res.json({ success: true, message: 'Kullanıcı parolası başarıyla sıfırlandı.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/users/:id - Delete user
usersRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);

    if (req.user!.id === id) {
      return res.status(400).json({
        success: false,
        error: 'Kendi hesabınızı silemezsiniz.'
      });
    }

    const user = dbService.getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });
    }

    dbService.deleteUser(id);
    res.json({ success: true, message: 'Kullanıcı başarıyla silindi.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
