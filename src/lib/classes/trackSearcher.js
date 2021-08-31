const SpotifyApi = require('spotify-web-api-node')
const { parse } = require('spotify-uri');
const { searchOne, getVideo, getPlaylist } = require('youtube-sr').default;
const regex = require('../utils/regex');
const {
  PLATFORM_NONE,
  PLATFORM_YOUTUBE,
  PLATFORM_SPOTIFY,
  TYPE_SONG,
  TYPE_ALBUM,
  TYPE_PLAYLIST, PLATFORM_FILE,
} = require('../utils/constants')
const Track = require('./track');

module.exports = class trackSearcher {
  /**
   *
   * @param spotifyID {string}
   * @param spotifySecret {string}
   * @param options {Object} {canUseCache {bool}}
   */
  constructor(spotifyID, spotifySecret, options) {
    this.spotify = new SpotifyApi({
      clientId: spotifyID,
      clientSecret: spotifySecret,
    });
    this.cache = {};
    this.canUseCache = options?.canUseCache
  }

  /**
   * Handle all connections
   */
  async connect() {
    await this.connectToSpotify()
  }

  /**
   * Connect to Spotify API
   */
  connectToSpotify() {
    this.spotify.clientCredentialsGrant().then(res => {
      this.spotify.setAccessToken(res.body.access_token)
      setTimeout(() => {
        this.connectToSpotify()
      }, 359000)
    })
  }

  /**
   * Test regex for what platform the link is and the type of data
   * @param string {string}
   * @returns {{type: number, platform: number}}
   */
  static resolveSearchMethod(string) {
    for (const [platform, platformType] of Object.entries(regex)) {
      for (const [type, Regex] of Object.entries(platformType)) {
        if (Regex.test(string)) return {platform: parseInt(platform), type: parseInt(type)};
      }
    }
    return {platform: PLATFORM_NONE, type: TYPE_SONG};
  }

  /**
   * Searches YouTube for a youtube based on a query string
   * @param searchString {string}
   * @returns {Promise<Object>}
   */
  static getYoutubeTrackFromString(searchString) {
    return searchOne(searchString);
  }

  /**
   * Chunk tracks for faster playing
   * @param tracks {string[]}
   * @param addedBy {string}
   * @returns {Generator<Promise<Track[]>>}
   */
  *generateTracks(tracks, addedBy) {
    const chunk = 10;
    const limit = tracks.length;
    let index = 0;
    while (index < limit) {
      let trackChunk = tracks.slice(index, index + chunk)
      for (let i = 0, j = trackChunk.length; i < j; i++) {
        trackChunk[i] = this.getTrackFromSpotify(trackChunk[i], addedBy)
      }
      index += chunk;
      yield Promise.all(trackChunk);
    }
  }

  /**
   * Get Track from platform and search
   * @param platform {number}
   * @param searchString {string}
   * @param addedBy {string}
   * @returns {Promise<Track>}
   */
  async getTrack(platform, searchString, addedBy) {
    const data = await this.resolveTrackSearch(platform, TYPE_SONG, searchString)
    switch (platform) {
      case PLATFORM_SPOTIFY:
        const string = trackSearcher.extractSpotifyNameByType(TYPE_SONG, data)
        return await this.getTrackFromSpotify(string, addedBy)
      case PLATFORM_YOUTUBE:
        return trackSearcher.extractTrackByYoutubeType(TYPE_SONG, data, addedBy);
      case PLATFORM_NONE:
        return trackSearcher.extractTrackByYoutubeType(TYPE_SONG, data, addedBy);
    }
  }

  /**
   * Get Tracks from platform, track type, and search
   * @param platform {number}
   * @param type {number}
   * @param searchString {string}
   * @param addedBy {string}
   * @returns {Promise<Track[]>}
   */
  async getTracks(platform, type, searchString, addedBy) {
    const tracks = await this.resolveTrackSearch(platform, type, searchString)
    switch (platform) {
      case PLATFORM_SPOTIFY: {
        const data = trackSearcher.extractSpotifyNameByType(type, tracks)
        for (let i = 0, j = data.length; i < j; i++) {
          data[i] = this.getTrackFromSpotify(data[i], addedBy)
        }
        return await Promise.all(data);
      }
      case PLATFORM_YOUTUBE: {
        return trackSearcher.extractTrackByYoutubeType(type, tracks, addedBy)
      }
    }
    return tracks;
  }
  /**
   * Gets the track from cache, otherwise searches for the track
   * @param searchString {string}
   * @param addedBy {string}
   * @returns {Promise<Track>}
   */
  async getTrackFromSpotify(searchString, addedBy) {
    if (this.canUseCache) {
      if (this.cache[searchString]) {
        return this.cache[searchString];
      }
    }
    let res = await trackSearcher.getYoutubeTrackFromString(searchString);

    if (res) {
      res = trackSearcher.youtubeDataToTrack(res);
      res.addedBy = addedBy;
      if (this.canUseCache) {
        this.cache[searchString] = res;
      }
      return res;
    }
  }

  /**
   * normalize file data into a track
   * @param data {string | Object}
   * @param options {Object}
   * @returns {Track}
   */
  static fileToTrack (data, options) {
    let trackData = {};
    if (typeof data === "string") {
      const details = regex[PLATFORM_FILE][TYPE_SONG].exec(data)
      trackData.title = details[2];
      trackData.url = data;
    } else {
      trackData = data;
    }
    if (options.addedBy) trackData.addedBy = options.addedBy
    return new Track(trackData);
  }
  /**
   * Youtube video data to track
   * @param res {Object}
   * @returns {Track}
   */
  static youtubeDataToTrack(res) {
    const id = res.id;
    const title = res.title;
    const duration = res.durationFormatted || '0:00';
    const addedBy = res.addedBy || ''
    return new Track({
      id: id,
      title: title,
      duration: duration,
      addedBy: addedBy
    });
  }

  /**
   * Get initial data as a promise
   * @param platform {number}
   * @param type {number}
   * @param searchString {string}
   * @returns {Promise}
   */
  resolveTrackSearch(platform, type, searchString) {
    switch (platform) {
      case PLATFORM_NONE:
        switch (type) {
          case TYPE_SONG:
            return trackSearcher.getYoutubeTrackFromString(searchString);
        }
        break;
      case PLATFORM_YOUTUBE:
        switch (type) {
          case TYPE_SONG:
            return getVideo(searchString);
          case TYPE_PLAYLIST:
            return getPlaylist(searchString);
        }
        break;
      case PLATFORM_SPOTIFY:
        const searchId = parse(searchString).id;
        switch (type) {
          case TYPE_SONG:
            return this.spotify.getTrack(searchId);
          case TYPE_ALBUM:
            return this.spotify.getAlbum(searchId);
          case TYPE_PLAYLIST:
            return new Promise(async (resolve, reject) => {
              let allTracks = []
              const plist = await this.spotify.getPlaylistTracks(searchId);
              if (!plist) {
                reject('No playlist named: ' + searchId);
              } else {
                const max = Math.trunc(plist.body.total / 100)
                for (let i = 0; i <= max; i++) {
                  const playlist = this.spotify.getPlaylistTracks(searchId, {offset: 100 * i});
                  allTracks.push(playlist);
                }
                resolve(Promise.all(allTracks));
              }
            });
        }
    }
  }

  /**
   * Takes spotify objects and returns the track title / artist name
   * @param type {number}
   * @param data {string}
   * @returns {string|string[]}
   */
  static extractSpotifyNameByType(type, data) {
    switch (type) {
      case TYPE_SONG: {
        return `${data.body.name || data.body.album.name} by ${data.body.artists[0].name}`;
      }
      case TYPE_ALBUM: {
        return data.body.tracks.items.map(data => `${data.name || data.album.name} by ${data.artists[0].name}`);
      }
      case TYPE_PLAYLIST: {
        let trackNames = [];
        for (let i = 0; i < data.length; i++) {
          trackNames = trackNames.concat(data[i].body.items.map(data => `${data.track.name || data.tracks.album.name} by ${data.track.artists[0].name}`));
        }
        return trackNames;
      }
    }
  }

  /**
   * Handles youtube types and returns a Track or an array of Tracks
   * @param type {number}
   * @param data {Object}
   * @param addedBy {string}
   * @returns {Track|Track[]}
   */
  static extractTrackByYoutubeType(type, data, addedBy) {
    switch (type) {
      case TYPE_SONG: {
        if (addedBy) data.addedBy = addedBy;
        return trackSearcher.youtubeDataToTrack(data);
      }
      case TYPE_PLAYLIST: {
        const tracks = data.videos;
        for (let i = 0; i < tracks.length; i++) {
          if (addedBy) tracks[i].addedBy = addedBy;
          tracks[i] = trackSearcher.youtubeDataToTrack(tracks[i]);
        }
        return tracks;
      }
    }
  }
}
