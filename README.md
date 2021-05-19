# Discord.js-Player
### Using npm Framework **[discord.js](https://discord.js.org)**
#### Requires a Spotify application
[![npm](https://img.shields.io/npm/v/discord.js-player)](https://npmjs.com/discord.js-player)


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
//Regular discord.js setup
const { Client } = require("discord.js");
const client = new Client();
const TOKEN = "YOUR_TOKEN";
const PREFIX = "!";
client.login(TOKEN);

//Music Setup
const { Player, EVENTS } = require("discord.js-player");
const { EVT_TRACK_START, EVT_TRACK_ADD } = EVENTS;
const YOUR_SPOTIFY_ID = "";
const YOUR_SPOTIFY_SECRET = "";

// Create a new Player (you need a Spotify ID/Secret)
client.music = new Player(YOUR_SPOTIFY_ID, YOUR_SPOTIFY_SECRET, {canUseCache: true});
client.music.connect();

//Optional Events
client.music.on(EVT_TRACK_START, (channel, track) => {
    channel.send(`Track ${track.title} started playing!`);
});
client.music.on(EVT_TRACK_ADD, (channel, tracks) => {
    channel.send(`Added ${tracks.length} to the queue!`);
});

client.on("message", async (message) => {
    if (!message.content.startsWith(PREFIX)) return;
    
    const args = message.content.slice(PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    //!play https://open.spotify.com/track/2Tax7fSPDly9OLIAZRd0Dp?si=i4825VV5THG_F-RNXBp8zA
    //!play https://www.youtube.com/watch?v=_LgTsA9-kyM
    //!play Through The Dark Alexi
    //will get track Through The Dark by Alexi Murdoch and play it
    if(command === "play"){
        
        //Make sure you are connected to a voice channel
        const voiceChannel = message.member.voice.channel
        let queue = client.music.getQueue(message.guild.id)
        //If no queue, one will be created
        if (!queue) queue = client.music.createQueue(message.guild.id, message.channel, voiceChannel, [], {emit: {trackStart: true}})
        //addedBy is optional
        client.music.play(queue.id, args.join(' '), {addedBy: message.author.username})
        
    } else if(command === "queue") {
        const shownQueue = client.music.getQueue(message.guild.id).showQueue({
            limit: 10,
            show: {
                queueNumber: true,
                addedBy: true,
                align: true,
                alignmentSpace: 70
            }
        })
        await message.channel.send(shownQueue.join('\n'))
        /**
         * Example of shownQueue
         * 
         * [1] Gold (feat. Casey Lee Williams)                                       4:03  [Requested By FrozenSynapses]
         * [2] I Burn By Jeff and Casey Lee Williams with Lyrics                     3:10  [Requested By FrozenSynapses]
         * [3] I May Fall (feat. Casey Lee Williams & Lamar Hall)                    4:04  [Requested By FrozenSynapses]
         * [4] Red Like Roses Part II by Jeff and Casey Lee Williams with Lyrics     4:05  [Requested By FrozenSynapses]
         * [5] I Burn Remix (feat. Casey Lee Williams)                               3:08  [Requested By FrozenSynapses]
         * [6] From Shadows (feat. Casey Lee Williams) by Jeff Williams with Lyrics  5:19  [Requested By FrozenSynapses]
         * [7] Wings (feat. Casey Lee Williams)                                      5:12  [Requested By FrozenSynapses]
         * [8] EP 1 Score - Ruby Rose                                                8:38  [Requested By FrozenSynapses]
         * [9] EP 2 Score - The Shining Beacon Pt 1                                  3:32  [Requested By FrozenSynapses]
         * [10] EP 3 Score - The Shining Beacon Pt 2                                 4:40  [Requested By FrozenSynapses]
         */
    }
});
```
##Other Methods
###Player
```js
Player.deleteQueue(QueueID)
```
###Queue
```js
Queue.loop()
Queue.loopQueue()

Queue.skipTrack(numberOfTracksToSkip)
Queue.shuffle()

Queue.pause()
Queue.resume()
Queue.setVolume(number)

//Handled automatically on Player.play()
Queue.join()
Queue.leave()



```
