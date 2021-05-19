const ytdl = require('ytdl-core')
const { EventEmitter } = require('events');
const Track = require('./track');
const { TextChannel, VoiceChannel } = require('discord.js');
const { EVENTS } = require('../utils/constants');
const { EVT_TRACK_ADD, EVT_SAVE, EVT_SHUFFLE, EVT_TRACK_START, EVT_ERROR} = EVENTS;
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
    this.volume = 5;
    this.isPlaying = false;
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
    await this.join()
    if (!track) {
      return;
    }

    await this.emit(EVT_TRACK_START, this.textChannel, track);
    const url = "https://www.youtube.com/watch?v=" + track.id;
    const stream = await ytdl(url, {
      filter: 'audioonly',
      dlChunkSize: 0
    });
    this.dispatcher = await this.connection.play(stream)
        .on('finish', () => {
          try {
            if (this.isLoopingQueue) {
              this.tracks.push(this.tracks[0]);
              this.tracks.shift();
            } else if (!this.isLooping) {
              this.tracks.shift();
            }
            this.play(this.tracks[0]);
            this.emit(EVT_SAVE, this);
          } catch (e) {
            console.error(e);
          }
        })
        .on('error', (error) => {
          console.error(error)
        })
    this.dispatcher.setVolumeLogarithmic(this.volume / 5);
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
    if (integer > 2) {
      integer = 2;
    }
    if (integer <= 0) {
      integer = 0.1;
    }
    this.volume = integer;
    this.dispatcher.setVolumeLogarithmic(integer / 5);
    this.emit(EVT_SAVE, this);
    return this;
  }
  /**
   * Destroy the queue connection
   * @returns {queue}
   */
  async leave() {
    await this.voiceChannel.leave();
    this.connection = null;
    return this;
  }
  /**
   * Create a connection to send audio streams
   * @returns {queue}
   */
  async join() {
    this.connection = await this.voiceChannel.join();
    this.emit(EVT_SAVE, this);
    return this;
  }
  /**
   * Skip tracks, optional number to skip # number of tracks
   * @param number {number}
   * @returns {null}
   */
  skipTrack(number = 1) {
    if (number > 1) {
      this.tracks = this.tracks.slice(0, (this.tracks.length - number) - 1)
    }
    this.connection.dispatcher.end()
    this.emit(EVT_SAVE, this);
  }

  /**
   * Show the queue in an array of strings, paginate to further break it up into "pages", arrays of track arrays.
   * @param options {{paginate: number, limit: number, show: {queueNumber: boolean, addedBy: boolean, align: boolean, alignmentSpace: number}}}
   * @returns {string[]|string[][]}
   */
  showQueue(options = {paginate: 0, limit: 0, show: { queueNumber: true, addedBy: false, align: true, alignmentSpace: 70}}) {
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