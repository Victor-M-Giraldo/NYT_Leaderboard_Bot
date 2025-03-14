// services/leaderboardService.js
const LeaderboardEntry = require('../models/leaderboard');
const ServerConfig = require('../models/serverConfig');

class LeaderboardService {
  /**
   * Add score to a user's leaderboard entry
   * @param {string} serverId - Discord server ID
   * @param {string} userId - Discord user ID
   * @param {number} score - Score to add
   * @returns {Promise<Object>} Updated entry
   */
  async addScore(serverId, userId, score) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let entry = await LeaderboardEntry.findOne({
      serverId,
      userId,
      year,
      month,
    });

    if (entry && entry.lastSubmission) {
      const lastSubmissionDate = new Date(entry.lastSubmission);
      if (
        lastSubmissionDate.getFullYear() === today.getFullYear() &&
        lastSubmissionDate.getMonth() === today.getMonth() &&
        lastSubmissionDate.getDate() === today.getDate()
      ) {
        throw new Error('You have already submitted a score today.');
      }
    }

    if (!entry) {
      entry = new LeaderboardEntry({
        serverId,
        userId,
        score: 0,
        year,
        month,
      });
    }

    entry.score += score;
    entry.lastSubmission = now;
    await entry.save();

    return entry;
  }

  /**
   * Get current month's leaderboard for a server
   * @param {string} serverId - Discord server ID
   * @returns {Promise<Array>} Sorted leaderboard entries
   */
  async getLeaderboard(serverId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const entries = await LeaderboardEntry.find({
      serverId,
      year,
      month,
    }).sort({ score: -1 });

    return entries;
  }

  /**
   * Get winner for a specific month
   * @param {string} serverId - Discord server ID
   * @param {number} month - Month (0-11)
   * @param {number} year - Year
   * @returns {Promise<Object|null>} Winner entry or null if no entries
   */
  async getWinner(serverId, month = null, year = null) {
    const now = new Date();
    const targetYear = year !== null ? year : now.getFullYear();
    const targetMonth = month !== null ? month : now.getMonth();

    const winner = await LeaderboardEntry.findOne({
      serverId,
      year: targetYear,
      month: targetMonth,
    }).sort({ score: -1 });

    return winner;
  }

  /**
   * Archive leaderboard (no action needed with MongoDB, as data is already stored)
   * @param {string} serverId - Discord server ID
   * @param {number} month - Month to archive (0-11)
   * @param {number} year - Year to archive
   */
  async archiveLeaderboard(serverId, month, year) {
    // With MongoDB, we don't need to do anything special for archiving
    // Data is already stored with month/year information
    console.log(`Leaderboard archived for ${serverId} - ${year}-${month + 1}`);
    return true;
  }

  /**
   * Reset current month's leaderboard (not used with MongoDB approach)
   * @param {string} serverId - Discord server ID
   */
  async resetLeaderboard(serverId) {
    // With our new approach, we don't reset anything
    // New entries will be created with the new month
    console.log(`No reset needed for ${serverId} - using new month in queries`);
    return true;
  }

  /**
   * Get all server IDs with configurations
   * @returns {Promise<Array>} List of server IDs
   */
  async getAllServerIds() {
    const servers = await ServerConfig.find({}, 'serverId');
    return servers.map((server) => server.serverId);
  }

  /**
   * Get announcement channel for a server
   * @param {string} serverId
   * @returns {Promise<string|null>} Channel ID or null
   */
  async getAnnouncementChannel(serverId) {
    const server = await ServerConfig.findOne({ serverId });
    return server ? server.announcementChannelId : null;
  }

  /**
   * Set announcement channel for a server
   * @param {string} serverId
   * @param {string} channelId
   */
  async setAnnouncementChannel(serverId, channelId) {
    const server = await ServerConfig.findOneAndUpdate(
      { serverId },
      { announcementChannelId: channelId },
      { upsert: true, new: true }
    );
    return server;
  }

  /**
   * Register a new server
   * @param {string} serverId
   * @param {string} channelId
   */
  async registerServer(serverId, channelId = null) {
    let server = await ServerConfig.findOne({ serverId });

    if (!server) {
      server = new ServerConfig({
        serverId,
        announcementChannelId: channelId,
      });
      await server.save();
    }

    return server;
  }
}

module.exports = new LeaderboardService();
