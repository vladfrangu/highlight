-- @param {String} $1:userId
-- @param {String} $2:guildId
SELECT
	array_agg(guild_ignored_channels.ignored_channel_id) as ignored_channels,
	array_agg(guild_ignored_users.ignored_user_id) as ignored_users
FROM guild_ignored_channels
LEFT JOIN guild_ignored_users ON
	guild_ignored_users.user_id = guild_ignored_channels.user_id
	AND guild_ignored_users.guild_id = guild_ignored_channels.guild_id
WHERE
	guild_ignored_channels.user_id = $1
	AND guild_ignored_channels.guild_id = $2
