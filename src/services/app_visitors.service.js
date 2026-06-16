const visitorsRepo = require('../repositories/visitors.repository')
const notifRepo    = require('../repositories/notifications.repository')
const { notifyVisitorNew, notifyVisitorCancelled, notifyUser } = require('../sockets/notifications')

const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code })

// ─── Invite visitor ───────────────────────────────────────────────────────────

const inviteVisitor = async (userId, d) => {
  const visitor = await visitorsRepo.create({
    invitedBy:        userId,
    visitorName:      d.visitorName,
    visitorPhone:     d.visitorPhone,
    visitorCarNumber: d.visitorCarNumber,
    purpose:          d.purpose,
    visitDate:        d.visitDate,
    visitTime:        d.visitTime,
    durationHours:    d.durationHours   || 1,
    durationMinutes:  d.durationMinutes || 0,
  })

  // Push in-app notification to the inviting user
  const notif = await notifRepo.create({
    userId,
    title:   'Visitor Invited',
    message: `${d.visitorName} has been invited. Tracking: ${visitor.trackingNumber}`,
    type:    'visitor_invited',
    data:    { visitorId: visitor._id, trackingNumber: visitor.trackingNumber },
  })
  notifyUser(userId, 'notification:new', notif)

  // Real-time broadcast → admin room + inviting user
  notifyVisitorNew(visitor, userId)

  return visitor
}

// ─── List visitors ────────────────────────────────────────────────────────────

const getVisitors = async (userId, { limit = 20, offset = 0, status } = {}) => {
  return visitorsRepo.findByUser(userId, { limit, offset, status })
}

// ─── Get by tracking number ───────────────────────────────────────────────────

const getByTracking = async (trackingNumber) => {
  const visitor = await visitorsRepo.findByTracking(trackingNumber)
  if (!visitor) throw err('Visitor not found', 404)
  return visitor
}

// ─── Cancel visitor ───────────────────────────────────────────────────────────

const cancelVisitor = async (userId, visitorId) => {
  const Visitor = require('../models/visitors.model')
  const visitor = await Visitor.findOne({ _id: visitorId, invitedBy: userId }).lean()
  if (!visitor) throw err('Visitor not found', 404)
  if (visitor.status === 'checked_in') throw err('Cannot cancel a visitor who has already checked in', 400)

  const updated = await visitorsRepo.updateStatus(visitorId, 'cancelled')

  // Real-time broadcast → admin room + cancelling user
  notifyVisitorCancelled(updated, userId)

  return updated
}

module.exports = { inviteVisitor, getVisitors, getByTracking, cancelVisitor }
