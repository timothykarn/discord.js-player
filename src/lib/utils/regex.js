const { PLATFORM_YOUTUBE, PLATFORM_SPOTIFY, TYPE_SONG, TYPE_ALBUM, TYPE_PLAYLIST} = require('./constants')

module.exports = {
    [PLATFORM_SPOTIFY]: {
        [TYPE_SONG]: /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:track\/|\?uri=spotify:track:)((\w|-){22})/,
        [TYPE_ALBUM]: /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:album\/|\?uri=spotify:album:)((\w|-){22})/,
        [TYPE_PLAYLIST]: /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:playlist\/|\?uri=spotify:playlist:)((\w|-){22})/,
    },
    [PLATFORM_YOUTUBE]: {
        [TYPE_SONG]: /https?:\/\/(www.youtube.com|youtube.com)\/watch(.*)$/,
        [TYPE_PLAYLIST]: /https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/,
    }
}