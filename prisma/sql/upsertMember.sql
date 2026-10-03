-- @param {String} $1:guildId
-- @param {String} $2:userId
INSERT INTO members (guild_id, user_id)
VALUES ($1, $2)
ON CONFLICT (guild_id, user_id) DO
	UPDATE SET user_id = $2
RETURNING *
