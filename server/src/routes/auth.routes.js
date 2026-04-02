import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createActivityLog } from '../services/history.service.js';
import {
  countUsers,
  createUser,
  getUserByUserId,
  markLastLogin,
  setRegistrationCodeHash,
  updatePasswordByUserId,
  validateRegistrationCode,
} from '../services/users.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { hashSecret, verifySecret } from '../utils/security.js';
import { signAuthToken } from '../utils/token.js';
import { normalizeUserId, requirePassword, requireString } from '../utils/validation.js';

const router = Router();

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const firstName = requireString(req.body.firstName, 'firstName', { max: 80 });
    const lastName = requireString(req.body.lastName, 'lastName', { max: 80 });
    const securityCode = requireString(req.body.securityCode, 'securityCode', { min: 4, max: 64 });
    const password = requirePassword(req.body.password);
    const confirmPassword = requirePassword(req.body.confirmPassword, 'confirmPassword');

    if (password !== confirmPassword) {
      throw new HttpError(400, 'Passwords do not match.');
    }

    const userCount = await countUsers();
    const isFirstUser = userCount === 0;

    if (!isFirstUser) {
      await validateRegistrationCode(securityCode);
    }

    const user = await createUser({
      firstName,
      lastName,
      passwordHash: hashSecret(password),
      role: isFirstUser ? 'admin' : 'staff',
    });

    if (isFirstUser) {
      await setRegistrationCodeHash(hashSecret(securityCode), user.id);
    }

    await createActivityLog({
      category: 'user',
      action: isFirstUser
        ? `Initial administrator account created for ${user.fullName}.`
        : `New staff account registered for ${user.fullName}.`,
      actor: user,
    });

    res.status(201).json({
      data: {
        token: signAuthToken(user),
        user,
        seededRegistrationCode: isFirstUser,
      },
    });
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const userId = normalizeUserId(req.body.userId);
    const password = requireString(req.body.password, 'password', { min: 8, max: 72 });
    const user = await getUserByUserId(userId, { includePasswordHash: true });

    if (!user || !verifySecret(password, user.passwordHash)) {
      throw new HttpError(401, 'Invalid user ID or password.');
    }

    if (user.status !== 'active') {
      throw new HttpError(403, 'This account is inactive.');
    }

    const authenticatedUser = await markLastLogin(user.id);

    await createActivityLog({
      category: 'auth',
      action: `User ${authenticatedUser.userId} signed in.`,
      actor: authenticatedUser,
    });

    res.json({
      data: {
        token: signAuthToken(authenticatedUser),
        user: authenticatedUser,
      },
    });
  }),
);

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const userId = normalizeUserId(req.body.userId);
    const securityCode = requireString(req.body.securityCode, 'securityCode', { min: 4, max: 64 });
    const newPassword = requirePassword(req.body.newPassword, 'newPassword');
    const confirmPassword = requirePassword(req.body.confirmPassword, 'confirmPassword');

    if (newPassword !== confirmPassword) {
      throw new HttpError(400, 'Passwords do not match.');
    }

    await validateRegistrationCode(securityCode);

    const existingUser = await getUserByUserId(userId);

    if (!existingUser) {
      throw new HttpError(404, 'User not found.');
    }

    const updatedUser = await updatePasswordByUserId(userId, hashSecret(newPassword));

    await createActivityLog({
      category: 'auth',
      action: `Password reset completed for ${updatedUser.userId}.`,
      actor: updatedUser,
    });

    res.json({
      data: {
        message: 'Password updated successfully.',
      },
    });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: req.user });
  }),
);

export default router;
