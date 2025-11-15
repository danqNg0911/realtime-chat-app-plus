import { IoPlay, IoPause, IoPlaySkipBack, IoPlaySkipForward, IoVolumeHigh, IoVolumeMute } from "react-icons/io5";
import { useAudio } from "../../../context/AudioContext";
import "./MusicPlayer.css";

const MusicPlayer = () => {
    const {
        songs,
        currentSongIndex,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        playSong,
        togglePlayPause,
        playNext,
        playPrevious,
        seek,
        changeVolume,
        toggleMute,
    } = useAudio();

    const handleSongSelect = (index) => {
        playSong(index);
    };

    const handleSeek = (e) => {
        const seekBar = e.currentTarget;
        const rect = seekBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const newTime = percent * duration;
        seek(newTime);
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        changeVolume(newVolume);
    };

    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="music-player">
            <div className="music-player-header">
                <h2>🎵 Music Player</h2>
                <p className="music-subtitle">Select a song to play</p>
            </div>

            <div className="songs-list">
                {songs.map((song, index) => (
                    <div
                        key={index}
                        className={`song-item ${currentSongIndex === index ? "active-song" : ""}`}
                        onClick={() => handleSongSelect(index)}
                    >
                        <div className="song-info">
                            <div className="song-icon">
                                {currentSongIndex === index && isPlaying ? (
                                    <IoPause />
                                ) : (
                                    <IoPlay />
                                )}
                            </div>
                            <div className="song-details">
                                <div className="song-name">{song.name}</div>
                            </div>
                        </div>
                        {currentSongIndex === index && (
                            <div className="playing-indicator">
                                <span className="bar"></span>
                                <span className="bar"></span>
                                <span className="bar"></span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {currentSongIndex !== null && (
                <div className="music-controls">
                    <div className="playback-controls">
                        <button
                            className="control-button nav-button"
                            onClick={playPrevious}
                            title="Previous"
                        >
                            <IoPlaySkipBack />
                        </button>
                        <button
                            className="control-button play-button"
                            onClick={togglePlayPause}
                            title={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? <IoPause /> : <IoPlay />}
                        </button>
                        <button
                            className="control-button nav-button"
                            onClick={playNext}
                            title="Next"
                        >
                            <IoPlaySkipForward />
                        </button>
                    </div>

                    <div className="progress-section">
                        <div className="current-song-name">
                            {songs[currentSongIndex]?.name}
                        </div>
                        <div className="progress-container">
                            <span className="time-display">{formatTime(currentTime)}</span>
                            <div className="seek-bar" onClick={handleSeek}>
                                <div
                                    className="seek-bar-progress"
                                    style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                                />
                            </div>
                            <span className="time-display">{formatTime(duration)}</span>
                        </div>

                        <div className="volume-container">
                            <button
                                className="volume-button"
                                onClick={toggleMute}
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted || volume === 0 ? <IoVolumeMute /> : <IoVolumeHigh />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="volume-slider"
                            />
                            <span className="volume-percentage">
                                {Math.round((isMuted ? 0 : volume) * 100)}%
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MusicPlayer;
