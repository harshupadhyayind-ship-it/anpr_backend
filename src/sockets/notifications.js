/**
 * Notification helpers – thin wrappers over getIO().emit()
 * so business logic never imports Socket.IO directly.
 */
const { getIO } = require('./index');

const emit = (room, event, payload) => {
  try { getIO().to(room).emit(event, { ...payload, timestamp: new Date() }); } catch {}
};

// ── Vendor / User ─────────────────────────────────────────────────────────────

const notifyVendorCreated = (vendorId, createdBy) =>
  emit('admin', 'vendor:created', { vendorId, createdBy });

const notifyUserCreated = (userId, createdBy, creatorRole) => {
  emit('admin', 'user:created', { userId, createdBy, creatorRole });
  if (creatorRole === 'vendor') {
    emit(`vendor:${createdBy}`, 'user:created', { userId, createdBy });
  }
};

const notifyUser = (userId, event, payload) =>
  emit(`user:${userId}`, event, payload);

// ── Visitors ──────────────────────────────────────────────────────────────────

/**
 * Broadcast a new visitor to the admin room.
 * Also push a notification to the inviting app user.
 */
const notifyVisitorNew = (visitor, invitedBy) => {
  emit('admin', 'visitor:new', { visitor, invitedBy });
  emit(`user:${invitedBy}`, 'visitor:new', { visitor });
};

/**
 * Broadcast a cancelled visitor to the admin room.
 * Also inform the inviting app user.
 */
const notifyVisitorCancelled = (visitor, cancelledBy) => {
  emit('admin', 'visitor:cancelled', { visitor, cancelledBy });
  emit(`user:${cancelledBy}`, 'visitor:cancelled', { visitor });
};

module.exports = {
  notifyVendorCreated,
  notifyUserCreated,
  notifyUser,
  notifyVisitorNew,
  notifyVisitorCancelled,
};
