# highlight

A simple to use highlight bot made using klasa and discord.js.

## Installation

Clone this repository, make sure you have git installed and run

```bash
npm i # Or yarn
```

Fill in all the required values in `config.json`, then run

```bash
node .
```

## Updating

DO NOT ADD BOTH FLAGS.

If you're updating from 1.1.x, you'll want to run the bot with `--migrate` once. This will make the documents update to the new storage system.

If you are looking into migrating to rethinkdb, just set the provider option to `rethinkdb` and launch the bot using `--migrate-rethink`.
