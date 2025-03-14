const mongoose = require('mongoose');

const LeaderboardEntrySchema = new mongoose.Schema({
  serverId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  score: {
    type: Number,
    default: 0,
  },
  lastSubmission: {
    type: Date,
    default: null,
  },
  year: {
    type: Number,
    required: true,
  },
  month: {
    type: Number,
    required: true,
  },
});

LeaderboardEntrySchema.index(
  { serverId: 1, userId: 1, year: 1, month: 1 },
  { unique: true }
);

module.exports = mongoose.model('LeaderboardEntry', LeaderboardEntrySchema);
