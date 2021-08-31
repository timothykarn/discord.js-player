const PF_NO = "None";
const PF_SP = "Spotify";
const PF_YT = "Youtube";
const PF_FL = "File";

const TY_SO = "Song";
const TY_AL = "Album";
const TY_PL = "Playlist";

const EVT_TRACK_ADD = 1;
const EVT_CHUNK_START = 2;
const EVT_CHUNK_END = 3;
const EVT_SHUFFLE = 4
const EVT_SAVE = 5;
const EVT_SKIP = 6;
const EVT_TRACK_START = 7;
const EVT_ERROR = 8;

const EVENTS = {
    EVT_CHUNK_START: EVT_CHUNK_START,
    EVT_CHUNK_END: EVT_CHUNK_END,
    EVT_ERROR: EVT_ERROR,
    EVT_SKIP: EVT_SKIP,
    EVT_SAVE: EVT_SAVE,
    EVT_SHUFFLE: EVT_SHUFFLE,
    EVT_TRACK_ADD: EVT_TRACK_ADD,
    EVT_TRACK_START: EVT_TRACK_START
}

const PLATFORM_NONE = 1;
const PLATFORM_SPOTIFY = 2;
const PLATFORM_YOUTUBE = 3;
const PLATFORM_FILE = 4;

const TYPE_SONG = 1;
const TYPE_ALBUM = 2;
const TYPE_PLAYLIST = 3;

const PLATFORM_TO_NAME = {
    [PLATFORM_NONE]: PF_NO,
    [PLATFORM_SPOTIFY]: PF_SP,
    [PLATFORM_YOUTUBE]: PF_YT,
    [PLATFORM_FILE]: PF_FL
}
const TYPE_TO_NAME = {
    [TYPE_SONG]: TY_SO,
    [TYPE_ALBUM]: TY_AL,
    [TYPE_PLAYLIST]: TY_PL
}

const PLATFORM_TYPES = {
    [PLATFORM_NONE]: [
        TY_SO
    ],
    [PLATFORM_SPOTIFY]: [
        TYPE_SONG,
        TYPE_ALBUM,
        TYPE_PLAYLIST
    ],
    [PLATFORM_YOUTUBE]: [
        TYPE_SONG,
        TYPE_PLAYLIST
    ],
    [PLATFORM_FILE]: [
        TYPE_SONG
    ]
}
module.exports = {
    PLATFORM_TYPES,
    PLATFORM_NONE,
    PLATFORM_SPOTIFY,
    PLATFORM_YOUTUBE,
    PLATFORM_FILE,
    TYPE_SONG,
    TYPE_ALBUM,
    TYPE_PLAYLIST,
    PLATFORM_TO_NAME,
    TYPE_TO_NAME,
    EVENTS
}