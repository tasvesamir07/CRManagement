const db = require('../config/database');

async function track(eventType, userId = null, metadata = null) {
  try {
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, metadata) VALUES ($1, $2, $3)`,
      [eventType, userId, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    console.error('Analytics track error:', err.message);
  }
}

async function getDashboardStats() {
  const totalUsers = await db.query('SELECT COUNT(*) FROM users WHERE is_active = true');
  const totalCourses = await db.query('SELECT COUNT(*) FROM courses WHERE is_active = true');
  const totalAnnouncements = await db.query('SELECT COUNT(*) FROM announcements');
  const sentAnnouncements = await db.query("SELECT COUNT(*) FROM announcements WHERE status = 'sent'");
  const scheduledAnnouncements = await db.query("SELECT COUNT(*) FROM announcements WHERE status = 'scheduled'");

  // Announcements per day (last 30 days)
  const perDay = await db.query(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM announcements
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date
  `);

  // Delivery stats per platform
  const deliveryStats = await db.query(`
    SELECT
      p.platform_type,
      p.platform_name,
      ap.platform_status,
      COUNT(*) as count
    FROM announcement_platforms ap
    JOIN platforms p ON ap.platform_id = p.id
    GROUP BY p.platform_type, p.platform_name, ap.platform_status
  `);

  // Top active users
  const topUsers = await db.query(`
    SELECT u.id, u.username, u.display_name, COUNT(a.id) as announcement_count
    FROM users u
    JOIN announcements a ON a.created_by = u.id
    WHERE u.is_active = true
    GROUP BY u.id, u.username, u.display_name
    ORDER BY announcement_count DESC
    LIMIT 10
  `);

  return {
    totalUsers: parseInt(totalUsers.rows[0]?.count || 0),
    totalCourses: parseInt(totalCourses.rows[0]?.count || 0),
    totalAnnouncements: parseInt(totalAnnouncements.rows[0]?.count || 0),
    sentAnnouncements: parseInt(sentAnnouncements.rows[0]?.count || 0),
    scheduledAnnouncements: parseInt(scheduledAnnouncements.rows[0]?.count || 0),
    announcementsPerDay: perDay.rows,
    deliveryStats: deliveryStats.rows,
    topUsers: topUsers.rows,
  };
}

module.exports = { track, getDashboardStats };
