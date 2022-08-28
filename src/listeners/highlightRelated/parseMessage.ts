// For each message received:
// Step 1: check that the message was received in a guild
// Step 2.1: check if we have any content to parse (content !== '')
// Step 2.2: Check if the message was sent by a bot or webhook, and the channel doesn't allow bot messages to be parsed
// Step 2.3: check if author opted out
// Step 3: Get results from highlight manager
// Step 4: iterate over each result and do the steps per result, giving regex priority over words

// Steps per result
// Step 1. Ensure the member that should be highlighted hasn't also opted out
// Step 1.1. If channel is NSFW, ensure the user opted into getting highlights from NSFW channels
// Step 2. Ensure the user wasn't mentioned in the message
// Step 3. Ensure the member that should be highlighted can see the channel
// Step 4. Ensure the users highlight after afk delay in guild was passed
// Step 5. Ensure the author of the message that should be highlighted for the member or the channel is not ignored
// Step 6. Create embed based on the guild's style
// Step 6.1. Regardless of the guild style that is set, if the member that got highlighted cannot read the channel history, then they won't get extra context
