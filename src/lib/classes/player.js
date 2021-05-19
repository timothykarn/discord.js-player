const Queue = require('./queue');
const TrackSearcher = require('./trackSearcher');
const { EventEmitter } = require('events');
const { TextChannel, VoiceChannel } = require('discord.js');
const Track = require('./track');

const { PLATFORM_SPOTIFY, TYPE_SONG, TYPE_PLAYLIST, EVENTS} = require('../utils/constants');
let trackSearcher

const { EVT_TRACK_ADD, EVT_SAVE, EVT_CHUNK_END, EVT_CHUNK_START, EVT_TRACK_START } = EVENTS

module.exports = class Player extends EventEmitter {

    /**
     *
     * @param spotifyID {string}
     * @param spotifySecret {string}
     * @param options {{canUseCache: boolean}}
     */
    constructor(spotifyID, spotifySecret, options = {}) {
        super();
        this.queues = new Map();
        this.spotifyID = spotifyID;
        this.spotifySecret = spotifySecret;
        this.options = options;
    }

    /**
     * Handle Player Connections
     */
    async connect(){
        trackSearcher = new TrackSearcher(this.spotifyID, this.spotifySecret, this.options);
        await trackSearcher.connect();
    }

    /**
     * Create a queue for the Player to manage
     * @param id {string|number}
     * @param textChannel {TextChannel}
     * @param voiceChannel {VoiceChannel}
     * @param tracks {Track[]}
     * @param options {{emit: {trackStart}}}
     * @returns {Queue}
     */
    createQueue(id, textChannel, voiceChannel, tracks, options = {}) {
        const newQueue = new Queue(id, textChannel, voiceChannel, tracks, options);
        this.queues.set(id, newQueue);
        newQueue.on(EVT_SAVE, (queue) => {
            this.queues.set(queue.id, queue);
        });

        if (options.emit?.trackStart) {
            newQueue.on(EVT_TRACK_START, (channel, track) => {
                this.emit(EVT_TRACK_START, channel, track);
            });
        }
        return newQueue;
    }

    /**
     * Delete a queue from the map
     * @param id {string|number}
     */
    deleteQueue(id) {
        this.queues.delete(id)
    }

    /**
     * Get a queue from an id
     * @param id {string|number}
     * @returns {Queue}
     */
    getQueue(id) {
        return this.queues.get(id)
    }

    /**
     * Finds and sends a track to the queue by ID
     * @param id {string|number}
     * @param searchString {string}
     * @param options {{addedBy: string}}
     */
    play(id, searchString, options = {}) {
        const {platform, type} = TrackSearcher.resolveSearchMethod(searchString);
        if (type === TYPE_SONG) {
            trackSearcher.getTrack(platform, searchString, options.addedBy).then(track => {
                this.sendTrackToQueue(id, track)
            })
        } else if (platform === PLATFORM_SPOTIFY && type === TYPE_PLAYLIST) {
            this.getTracksAndChunkToQueue(id, platform, type, searchString, options.addedBy)
        } else {
            trackSearcher.getTracks(platform, type, searchString, options.addedBy).then(tracks => {
                this.sendTracksToQueue(id, tracks)
            })
        }
    }

    /**
     * Sends a single track to a queue
     * @param id {string|number}
     * @param track {Track}
     */
    sendTrackToQueue(id, track) {
        const queue = this.queues.get(id)
        queue.addToQueue(track)
        this.emit(EVT_TRACK_ADD, queue.textChannel, [track])
    }

    /**
     * Sends multiple tracks to a queue
     * @param id {string|number}
     * @param tracks {Track[]}
     */
    sendTracksToQueue(id, tracks) {
        const queue = this.queues.get(id)
        queue.addToQueue(tracks)
        this.emit(EVT_TRACK_ADD, queue.textChannel, tracks)
    }

    /**
     * Chunk tracks from a spotify playlist so that time to interact is reduced
     * @param queueID {string|number}
     * @param platform {number}
     * @param type {number}
     * @param searchString {string}
     * @param addedBy {string}
     */
    async getTracksAndChunkToQueue(queueID, platform, type, searchString, addedBy) {
        const queue = this.getQueue(queueID)
        switch (platform) {
            case PLATFORM_SPOTIFY: {
                const data = await trackSearcher.resolveTrackSearch(platform, type, searchString)
                let tracks = await TrackSearcher.extractSpotifyNameByType(type, data)
                tracks = tracks.reverse()
                this.emit(EVT_CHUNK_START, queue.textChannel, tracks.length)
                const trackGenerator = await trackSearcher.generateTracks(tracks, addedBy)
                let done = false;
                while (!done) {
                    const tracks = trackGenerator.next()
                    done = tracks.done
                    if (!done) {
                        await this.getQueue(queueID).addToQueue(await tracks.value)
                    }
                }
                this.emit(EVT_CHUNK_END, queue.textChannel, tracks.length)
            }
        }
    }
}