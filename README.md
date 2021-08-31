# Discord.js-Player
### Using npm Framework **[discord.js](https://discord.js.org)**
#### Requires a Spotify API Token
[![npm](https://img.shields.io/npm/v/discord.js-player)](https://npmjs.com/discord.js-player)
[![npm](https://img.shields.io/npm/v/discord.js)](https://npmjs.com/discord.js-player)


###Recent Change:
- Recently updated to connect with discord.js@^13.1.0
- Added upload media playing, simply type the command and attach a file or link the media to play

## Install
### Install **[discord.js-player](https://npmjs.com/package/discord.js-player)**
```sh
$ npm install discord.js-player
```
### Install FFmpeg
-  **[Local FFmpeg Npm](https://npmjs.com/package/ffmpeg-static)** if you do not want FFmpeg installed globally
### Create a Spotify application and copy-paste your spotify id and secret
- **[Spotify API Website](https://developer.spotify.com/dashboard/)**
## Project Setup
Using the discord.js framework, here is an example of code to play a track.
```js
const { Client, Intents} = require("discord.js");
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_PRESENCES] });
const TOKEN = "";
const PREFIX = "?";
client.login(TOKEN).then(_=>console.log("logged in!"));


//Music Setup
const { Player, EVENTS } = require("..");
const { EVT_TRACK_START, EVT_TRACK_ADD } = EVENTS;
const YOUR_SPOTIFY_ID = "";
const YOUR_SPOTIFY_SECRET = "";

// Create a new Player (you need a Spotify ID/Secret)
client.music = new Player(
    YOUR_SPOTIFY_ID, 
    YOUR_SPOTIFY_SECRET, 
    {canUseCache: true}
);
client.music.connect();

//Optional Events
client.music.on(EVT_TRACK_START, (channel, track) => {
    channel.send(`Track ${track.title} started playing!`);
});
client.music.on(EVT_TRACK_ADD, (channel, tracks) => {
    channel.send(`Added ${tracks.length} to the queue!`);
});

client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    //!play https://open.spotify.com/track/2Tax7fSPDly9OLIAZRd0Dp?si=i4825VV5THG_F-RNXBp8zA
    //!play https://www.youtube.com/watch?v=_LgTsA9-kyM
    //!play Through The Dark Alexi
    //will get track Through The Dark by Alexi Murdoch and play it
    if (command === "play") {

        //Make sure you are connected to a voice channel
        const voiceChannel = message.member.voice.channel;
        let queue = client.music.getQueue(message.guild.id);

        //If no queue, one will be created
        if (!queue) queue = client.music.createQueue(
            message.guild.id, 
            message.channel, 
            voiceChannel, 
            [], 
            {emit: {trackStart: true}}
        );

        const search = (message.attachments.first())?.url ?? args.join(' ');

        //addedBy is optional
        client.music.play(
            queue.id, 
            search, 
            {addedBy: message.author.username}
        );

    } else if (command === "queue") {
        const shownQueue = client.music.getQueue(message.guild.id).showQueue({
            limit: 10,
            show: {
                queueNumber: true,
                addedBy: true,
                align: true,
                alignmentSpace: 70
            }
        })
        await message.channel.send(shownQueue.join('\n'));
    }
    else if (command === 'skip') {
        client.music.getQueue(message.guild.id).skipTrack();
        message.channel.send("skipped!");

    } else if (command === "volume") {
        client.music.getQueue(message.guild.id).setVolume(args[0]);
        message.channel.send("Volume changed to " + args[0]);

    } else if (command === "leave") {
        client.music.getQueue(message.guild.id).leave();
    }
})
```
Additional Methods
- Player
```js
Player.deleteQueue(QueueID)
```
- Queue
```js
Queue.loop()
Queue.loopQueue()

Queue.skipTrack(numberOfTracksToSkip)
Queue.shuffle()

Queue.play()
Queue.pause()
Queue.resume()
Queue.setVolume(number) //~ 1-200 for volume
Queue.skip(number)

//Handled automatically on Player.play()
Queue.join()
Queue.leave()



```
