-- @param {String} $1:channelId
-- @param $2:memberIds
-- @param {String} $3:guildId
SELECT
	users.id as user_id,
	users.opted_out,
	users.grace_period,
	users.adult_channel_highlights,
	users.direct_message_failed_attempts,
	users.direct_message_cooldown_expires_at,
	array_agg(guild_ignored_channels.ignored_channel_id) as server_ignored_channels,
	array_agg(guild_ignored_users.ignored_user_id) as server_ignored_users,
	array_agg(global_ignored_users.ignored_user_id) as globally_ignored_users,
	user_activities.last_active_at
FROM users
LEFT JOIN members m ON
	users.id = m.user_id
LEFT JOIN user_activities ON
	channel_id = $1
	AND users.id = user_activities.user_id
LEFT JOIN guild_ignored_channels ON
	guild_ignored_channels.user_id = m.user_id
	AND guild_ignored_channels.guild_id = m.guild_id
LEFT JOIN guild_ignored_users ON
	guild_ignored_users.guild_id = m.guild_id
	AND guild_ignored_users.user_id = m.user_id
LEFT JOIN global_ignored_users ON
	global_ignored_users.user_id = m.user_id
WHERE
	m.user_id = ANY($2::text[])
	AND m.guild_id = $3
GROUP BY
	users.id,
	user_activities.last_active_at
