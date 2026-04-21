"use client";

import { Pause, Play, Volume2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { RunResult } from "@voicegauntlet/core";

export function WaveformReplay({ run }: { run: RunResult }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const evidence = run.audioEvidence;
  const audioUrl = evidence.url ?? run.audioUrl;
  const label = useMemo(() => evidenceLabel(evidence.source), [evidence.source]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    try {
      setError(null);
      if (playing) {
        audio.pause();
        setPlaying(false);
      } else {
        await audio.play();
        setPlaying(true);
      }
    } catch (playError) {
      setPlaying(false);
      setError(playError instanceof Error ? playError.message : "Audio playback failed.");
    }
  }

  if (!audioUrl) {
    return (
      <div className="audio-empty" data-testid="audio-empty">
        <div className="audio-empty-icon">
          <Volume2 size={18} />
        </div>
        <div>
          <div className="micro-label">No Audio Evidence</div>
          <p>{evidence.warning ?? "This result is a text simulation transcript only."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="audio-player" data-testid="audio-player">
      <audio
        ref={audioRef}
        preload="metadata"
        src={audioUrl}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration);
          setCurrentTime(event.currentTarget.currentTime);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(audioRef.current?.duration ?? currentTime);
        }}
        onError={() => {
          setPlaying(false);
          setError("The audio asset could not be loaded.");
        }}
      />
      <button className="audio-toggle" type="button" onClick={togglePlayback} aria-label={playing ? "Pause audio evidence" : "Play audio evidence"}>
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <div className="audio-meta">
        <div className="micro-label">{label}</div>
        <p>{evidence.label}</p>
        <div className="audio-bar" aria-hidden="true">
          <span style={{ width: `${audioProgress(currentTime, duration)}%` }} />
        </div>
        {error ? <div className="audio-error">{error}</div> : null}
      </div>
      <div className="audio-duration" data-testid="audio-duration">
        {Number.isFinite(duration ?? NaN) ? formatDuration(duration ?? 0) : "ready"}
      </div>
    </div>
  );
}

function evidenceLabel(source: RunResult["audioEvidence"]["source"]) {
  switch (source) {
    case "recorded_call":
      return "Recorded ElevenLabs Call";
    case "generated_replay":
      return "Generated Replay";
    case "turn_player":
      return "Turn Player";
    default:
      return "Transcript Only";
  }
}

function formatDuration(value: number) {
  const safe = Math.max(0, Math.round(value));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function audioProgress(currentTime: number, duration: number | null) {
  if (!duration || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, (currentTime / duration) * 100));
}
