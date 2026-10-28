import { Request, Response, NextFunction } from 'express';
import { dbService, SafeUser } from '../db.js';

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // 1. Check Bearer token in Authorization header
  let token = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query.token && typeof req.query.token === 'string') {
    // 2. Also support query parameter token for PDF preview / download links
    token = req.query.token.trim();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Oturum açmanız gerekmektedir.'
    });
  }

  const user = dbService.getSessionUser(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Oturum süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapın.'
    });
  }

  req.user = user;
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Bu işlem için yönetici yetkisi gereklidir.'
    });
  }
  next();
}
