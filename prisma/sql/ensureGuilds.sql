-- @param $1:guildIds
INSERT INTO guilds (guild_id) SELECT unnest($1::text[]) ON CONFLICT DO NOTHING
