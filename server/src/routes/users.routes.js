import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { createActivityLog } from '../services/history.service.js';
import {
  countAdmins,
  getRegistrationCodeMeta,
  getUserById,
  getUserStatusSummary,
  listUsers,
  setRegistrationCodeHash,
  updateUserRecord,
} from '../services/users.service.js';
import { USER_ROLES, USER_STATUSES } from '../utils/constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { hashSecret } from '../utils/security.js';
import { optionalEnum, optionalString, parseCsvFilter, parsePagination, requireString } from '../utils/validation.js';

const router = Router();

function buildUserUpdateMessage(before, after) {
  const changes = [];

  if (before.role !== after.role) {
    changes.push(`role changed from ${before.role} to ${after.role}`);
  }

  if (before.status !== after.status) {
    changes.push(`status changed from ${before.status} to ${after.status}`);
  }

  if ((before.reason ?? null) !== (after.reason ?? null)) {
    changes.push(`reason changed from ${before.reason ?? '-'} to ${after.reason ?? '-'}`);
  }

  return `User updated for ${after.fullName}: ${changes.join('; ')}.`;
}

router.use(requireAuth, requireAdmin);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = req.query.search ? requireString(req.query.search, 'search', { max: 64 }) : undefined;
    const statuses = parseCsvFilter(req.query.status, USER_STATUSES, 'status');
    const { page, pageSize } = parsePagination(req.query);

    const [usersResult, summary, registrationCode] = await Promise.all([
      listUsers({ search, statuses, page, pageSize }),
      getUserStatusSummary(),
      getRegistrationCodeMeta(),
    ]);

    res.json({
      data: usersResult.data,
      meta: usersResult.meta,
      summary: {
        currentUser: req.user,
        activeUsers: summary.activeUsers,
        inactiveUsers: summary.inactiveUsers,
        registrationSecurityCodeConfigured: registrationCode.configured,
        registrationSecurityCodeUpdatedAt: registrationCode.updatedAt,
      },
    });
  }),
);

router.put(
  '/registration-code',
  asyncHandler(async (req, res) => {
    const securityCode = requireString(req.body.securityCode, 'securityCode', { min: 4, max: 64 });
    const settings = await setRegistrationCodeHash(hashSecret(securityCode), req.user.id);

    await createActivityLog({
      category: 'user',
      action: `Organization security code rotated by ${req.user.fullName}.`,
      actor: req.user,
    });

    res.json({
      data: {
        configured: Boolean(settings?.registration_code_hash),
        updatedAt: settings?.registration_code_updated_at ?? null,
      },
    });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const targetUser = await getUserById(req.params.id);

    if (!targetUser) {
      throw new HttpError(404, 'User not found.');
    }

    const role = optionalEnum(req.body.role, 'role', USER_ROLES);
    const status = optionalEnum(req.body.status, 'status', USER_STATUSES);
    const reason = optionalString(req.body.reason, 'reason', { max: 255 });

    if (req.user.id === targetUser.id && status === 'inactive') {
      throw new HttpError(400, 'You cannot deactivate your own account.');
    }

    if (req.user.id === targetUser.id && role && role !== 'admin') {
      throw new HttpError(400, 'You cannot remove your own administrator role.');
    }

    const removingAdminAccess =
      targetUser.role === 'admin' && ((role && role !== 'admin') || status === 'inactive');

    if (removingAdminAccess) {
      const activeAdminCount = await countAdmins();

      if (activeAdminCount <= 1) {
        throw new HttpError(400, 'At least one active administrator must remain.');
      }
    }

    if (status === 'inactive' && targetUser.status !== 'inactive' && !reason) {
      throw new HttpError(400, 'A reason is required when deactivating a user.');
    }

    const updated = await updateUserRecord({ id: req.params.id, role, status, reason });

    await createActivityLog({
      category: 'user',
      action: buildUserUpdateMessage(updated.before, updated.after),
      actor: req.user,
    });

    res.json({ data: updated.after });
  }),
);

export default router;
