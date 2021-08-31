const ytdl = require('ytdl-core')
const {EventEmitter} = require('events');
const Track = require('./track');
const {TextChannel, VoiceChannel} = require('discord.js');
const {EVENTS} = require('../utils/constants');
const {joinVoiceChannel, createAudioPlayer, createAudioResource, AudioResource} = require('@discordjs/voice');
const {EVT_TRACK_ADD, EVT_SAVE, EVT_SHUFFLE, EVT_TRACK_START, EVT_ERROR} = EVENTS;
module.exports = class queue extends EventEmitter {
    /**
     * @param id {number}
     * @param textChannel {TextChannel}
     * @param voiceChannel {VoiceChannel}
     * @param tracks {Track[]}
     * @param options {object}
     */
    constructor(id, textChannel, voiceChannel, tracks, options) {
        super();
        this.id = id;
        if (Array.isArray(tracks)) {
            this.tracks = tracks;
        } else {
            this.tracks = tracks ? [tracks] : [];
        }
        this.options = options;
        this.textChannel = textChannel;
        this.voiceChannel = voiceChannel;
        this.isLooping = false;
        this.isLoopingQueue = false;
        this.volume = 1;
        this.isPlaying = false;
        this.connected = false;
    }

    /**
     * Loops the entire queue's tracks
     * @returns {queue}
     */
    loopQueue() {
        this.isLoopingQueue = !this.isLoopingQueue;
        this.emit(EVT_SAVE, this);
        return this;
    }

    /**
     * Loops the queue's current track
     * @returns {queue}
     */
    loop() {
        this.isLooping = !this.isLooping;
        this.emit(EVT_SAVE, this);
        return this;
    }

    /**
     * Pauses the audio stream
     * @returns {queue}
     */
    pause() {
        this.dispatcher.pause();
        this.isPlaying = false;
        return this;
    }

    /**
     * Resume's the audio stream
     * @returns {queue}
     */
    resume() {
        this.dispatcher.resume();
        this.isPlaying = true;
        return this;
    }

    /**
     * Shuffles the queue randomly based on an arr[i] = arr[j], arr[j] = arr[i] pattern
     * @returns {queue}
     */
    shuffle() {
        const firstTrack = this.tracks[0];
        this.tracks = this.tracks.slice(1);
        for (let i = this.tracks.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
        }
        this.tracks.unshift(firstTrack);
        this.emit(EVT_SHUFFLE, this);
        this.emit(EVT_SAVE, this);
        return this;
    }

    /**
     * Emits an event to the Player to save/set the queue
     * @returns {queue}
     */
    save() {
        this.emit(EVT_SAVE, this);
        return this;
    }

    /**
     * Adds a track or an array of tracks to the queue
     * Plays the first track if the queue was empty
     * @param data {Track|Track[]}
     * @returns {queue}
     */
    async addToQueue(data) {
        let isArray = Array.isArray(data);
        if (isArray) {
            this.tracks = this.tracks.concat(data.filter(t => t && t.title));
        } else if (data.title) {
            this.tracks.push(data);
        }
        await this.emit(EVT_TRACK_ADD, isArray ? data.length : 1);
        if (!this.isPlaying && this.tracks[0]) {
            this.isPlaying = true;
            await this.play(this.tracks[0]);
        }
        await this.emit(EVT_SAVE, this);
        return this;
    }

    /**
     * Grabs a track and plays an audio stream, creates dispatcher
     * @param track {Track}
     * @returns {null}
     */
    async play(track) {

        //Create Voice Connection
        if (!this.connected) await this.join()
        if (!track) return this.leave();

        //Audio Player Creation
        if (!this.dispatcher) {
            this.dispatcher = createAudioPlayer({})
            await this.connection.subscribe(this.dispatcher)

            this.dispatcher.on('stateChange', async (oldState, newState) => {
                if (newState.status === "idle") {
                    this.isPlaying = false;
                    try {
                        //Handle queue/looping logic
                        if (this.isLoopingQueue) {
                            this.tracks.push(this.tracks[0]);
                            this.tracks.shift();
                        } else if (!this.isLooping) {
                            this.tracks.shift();
                        }
                    } catch (e) {
                        this.emit(EVT_ERROR, this.textChannel, e)
                    }
                    if (this.tracks[0]) this.play(track)
                    else {
                        setTimeout(() => {
                            if (!this.tracks[0]) return this.leave()
                        }, 60000)
                    }
                } else {
                    this.isPlaying = true;
                }
            }).on('error', (error) => {
                this.emit(EVT_ERROR, this.textChannel, error)
                console.error(error)
            })
        }

        //Resource Plays
        const resource = await this.handleAudioResource(track)
        await this.emit(EVT_TRACK_START, this.textChannel, this.tracks[0]);
        this.dispatcher.play(resource)
    }

    /**
     * Normalize audio resources to play
     * @param track {Track}
     * @returns {Promise<AudioResource>}
     */
    async handleAudioResource(track) {
        let res;
        if (/youtu(\.?)be/.test(track.url)) {
            res = await createAudioResource(ytdl(track.url, {
                filter: 'audioonly',
                dlChunkSize: 0
            }), {inlineVolume: this.volume !== 1});
        } else {
            res = await createAudioResource(track.url, {inlineVolume: this.volume !== 1});
        }
        if (this.volume !== 1) res.volume.setVolume(this.volume);
        return res;
    }

    /**
     * Sets the volume for the queue
     * @param integer {number}
     * @returns {queue}
     */
    setVolume(integer) {
        if (isNaN(integer)) {
            integer = parseInt(integer)
        }
        if (!integer) {
            this.emit(EVT_ERROR, this.textChannel, 'Volume input was not a number')
            return this
        }
        if (integer > 200) {
            integer = 200;
        }
        if (integer <= 0) {
            integer = 1;
        }
        this.volume = integer / 100;
    }

    /**
     * Destroy the queue connection
     * @returns {queue}
     */
    async leave() {
        if (this.connected) {
            this.connection.destroy();
            this.connection = null;
            this.dispatcher = null;
            this.connected = false;
            this.isPlaying = false;
        }
        return this;
    }

    /**
     * Create a connection to send audio streams
     * @returns {queue}
     */
    async join() {
        this.connection = await joinVoiceChannel({
            channelId: this.voiceChannel.id,
            guildId: this.textChannel.guild.id,
            adapterCreator: this.textChannel.guild.voiceAdapterCreator,
        });
        this.connected = true;
        if (this.tracks[0]) this.play(this.tracks[0]);
        this.emit(EVT_SAVE, this);
        return this;
    }

    /**
     * Skip tracks, optional number to skip # number of tracks
     * @param number {number}
     * @returns {null}
     */
    skipTrack(number = 1) {
        this.tracks = this.tracks.slice(number - 1)
        this.dispatcher.stop()
        this.emit(EVT_SAVE, this);
    }

    /**
     * Show the queue in an array of strings, paginate to further break it up into "pages", arrays of track arrays.
     * @param options {{paginate: number, limit: number, show: {queueNumber: boolean, addedBy: boolean, align: boolean, alignmentSpace: number}}}
     * @returns {string[]|string[][]}
     */
    showQueue(options = {
        paginate: 0,
        limit: 0,
        show: {queueNumber: true, addedBy: false, align: true, alignmentSpace: 70}
    }) {
        const queue = this
        queue.tracks = queue.tracks.filter(t => t && t.title)
        if (queue.tracks.length !== this.tracks.length) {
            this.tracks = queue.tracks
            this.emit(EVT_SAVE, this)
        }
        if (typeof options?.limit === 'number' && options.limit !== 0) {
            queue.tracks = queue.tracks.slice(0, options.limit);
        }
        const pages = [];
        let queueNumber = 1;
        const alignmentSpace = options?.show?.alignmentSpace || 70;
        if (typeof options?.paginate === 'number' && options.paginate !== 0) {
            const max = queue.tracks.length / options.paginate;
            for (let i = 0; i < max; i++) {
                const page = queue.tracks.slice(i * options.paginate, options.paginate + (i * options.paginate))
                pages.push(page);
            }
        }
        const mapper = track => {
            let title = track.title
            if (options?.show?.align) {
                const queueNumberSpace = 0 - queueNumber.toString().length
                const spaceToAdd = (alignmentSpace - title.length) + queueNumberSpace
                if (spaceToAdd > 0) {
                    title += ' '.repeat(spaceToAdd);
                }
            }
            return (options?.show?.queueNumber ? `[${queueNumber++}] ` : '') + `${title} ${track.duration}  ${(options?.show?.addedBy && track.addedBy ? `[Requested By ${track.addedBy}]` : '')}`
        }

        if (typeof options?.paginate === 'number' && options.paginate !== 0) {
            for (let i = 0, j = pages.length; i < j; i++) {
                pages[i] = pages[i].map(mapper)
            }
            return pages;
        } else {
            return queue.tracks.map(mapper)
        }
    }
}