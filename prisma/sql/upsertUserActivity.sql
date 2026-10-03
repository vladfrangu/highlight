-- @param {String} $1:userId
-- @param {String} $2:channelId
-- @param {String} $3:guildId
INSERT INTO user_activities (user_id, channel_id, guild_id, last_active_at)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (user_id, channel_id) DO
	UPDATE SET last_active_at = NOW()
