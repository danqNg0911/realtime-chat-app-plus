import { createContext, useContext, useRef, useState, useEffect } from "react";

const AudioContext = createContext(null);

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error("useAudio must be used within AudioProvider");
    }
    return context;
};

export const AudioProvider = ({ children }) => {
    const audioRef = useRef(null);
    const playPromiseRef = useRef(null);
    const [currentSongIndex, setCurrentSongIndex] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    const [songs] = useState([
        {
            name: import.meta.env.VITE_MUSIC_1_NAME || "The Nights - Avicii",
            url: import.meta.env.VITE_MUSIC_1_URL || "/music/the-nights.mp3",
        },
        {
            name: import.meta.env.VITE_MUSIC_2_NAME || "Until I Found You - Stephen Sanchez",
            url: import.meta.env.VITE_MUSIC_2_URL || "/music/until-i-found-you.mp3",
        },
        {
            name: import.meta.env.VITE_MUSIC_3_NAME || "Demons - Imagine Dragons",
            url: import.meta.env.VITE_MUSIC_3_URL || "/music/demons.mp3",
        },
    ]);

    const playSong = (index) => {
        if (currentSongIndex === index) {
            // Same song - toggle play/pause
            togglePlayPause();
        } else {
            // Different song - switch and play
            setCurrentSongIndex(index);
            setIsPlaying(true);
        }
    };

    const togglePlayPause = () => {
        if (currentSongIndex === null) return;

        if (isPlaying) {
            // Wait for play promise before pausing
            if (playPromiseRef.current) {
                playPromiseRef.current
                    .then(() => {
                        audioRef.current?.pause();
                        setIsPlaying(false);
                        playPromiseRef.current = null;
                    })
                    .catch(() => {
                        setIsPlaying(false);
                        playPromiseRef.current = null;
                    });
            } else {
                audioRef.current?.pause();
                setIsPlaying(false);
            }
        } else {
            playPromiseRef.current = audioRef.current?.play();
            playPromiseRef.current
                ?.then(() => {
                    setIsPlaying(true);
                    playPromiseRef.current = null;
                })
                .catch((error) => {
                    if (error.name !== 'AbortError') {
                        console.error("Error playing audio:", error);
                    }
                    setIsPlaying(false);
                    playPromiseRef.current = null;
                });
        }
    };

    const playNext = () => {
        if (songs.length === 0) return;

        const newIndex = currentSongIndex === null || currentSongIndex === songs.length - 1
            ? 0
            : currentSongIndex + 1;

        setCurrentSongIndex(newIndex);
        setIsPlaying(true);
    };

    const playPrevious = () => {
        if (songs.length === 0) return;

        const newIndex = currentSongIndex === null || currentSongIndex === 0
            ? songs.length - 1
            : currentSongIndex - 1;

        setCurrentSongIndex(newIndex);
        setIsPlaying(true);
    };

    const seek = (time) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const changeVolume = (newVolume) => {
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
        if (newVolume === 0) {
            setIsMuted(true);
        } else {
            setIsMuted(false);
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            if (isMuted) {
                audioRef.current.volume = volume;
                setIsMuted(false);
            } else {
                audioRef.current.volume = 0;
                setIsMuted(true);
            }
        }
    };

    // Load and play song when index changes
    useEffect(() => {
        if (currentSongIndex !== null && audioRef.current) {
            const song = songs[currentSongIndex];
            if (song?.url) {
                // Pause current playback and wait for promise to resolve
                const currentPromise = playPromiseRef.current;

                if (currentPromise) {
                    currentPromise
                        .then(() => {
                            audioRef.current?.pause();
                            playPromiseRef.current = null;
                            loadAndPlaySong(song);
                        })
                        .catch(() => {
                            playPromiseRef.current = null;
                            loadAndPlaySong(song);
                        });
                } else {
                    audioRef.current.pause();
                    loadAndPlaySong(song);
                }
            }
        }
    }, [currentSongIndex, songs]);

    const loadAndPlaySong = (song) => {
        if (!audioRef.current) return;

        audioRef.current.src = song.url;
        audioRef.current.volume = isMuted ? 0 : volume;
        audioRef.current.load();

        if (isPlaying) {
            // Small delay to ensure load completes
            setTimeout(() => {
                playPromiseRef.current = audioRef.current?.play();
                playPromiseRef.current
                    ?.then(() => {
                        playPromiseRef.current = null;
                    })
                    .catch((error) => {
                        if (error.name !== 'AbortError') {
                            console.error("Error playing audio:", error);
                        }
                        setIsPlaying(false);
                        playPromiseRef.current = null;
                    });
            }, 50);
        }
    };

    // Sync playing state with audio element
    useEffect(() => {
        if (currentSongIndex !== null && audioRef.current && audioRef.current.src) {
            if (isPlaying && audioRef.current.paused && audioRef.current.readyState >= 2) {
                playPromiseRef.current = audioRef.current.play();
                playPromiseRef.current
                    ?.then(() => {
                        playPromiseRef.current = null;
                    })
                    .catch((error) => {
                        if (error.name !== 'AbortError') {
                            console.error("Error playing audio:", error);
                            setIsPlaying(false);
                        }
                        playPromiseRef.current = null;
                    });
            } else if (!isPlaying && !audioRef.current.paused) {
                if (playPromiseRef.current) {
                    playPromiseRef.current
                        .then(() => {
                            audioRef.current?.pause();
                            playPromiseRef.current = null;
                        })
                        .catch(() => {
                            playPromiseRef.current = null;
                        });
                } else {
                    audioRef.current.pause();
                }
            }
        }
    }, [isPlaying, currentSongIndex]);

    // Audio event listeners
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration);
        const handleEnded = () => playNext();

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const value = {
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
    };

    return (
        <AudioContext.Provider value={value}>
            {children}
            <audio ref={audioRef} />
        </AudioContext.Provider>
    );
};
