"use client";

import { useEffect, useMemo, useRef } from "react";
import type WaveSurfer from "wavesurfer.js";
import type { RunResult } from "@voicegauntlet/core";

export function WaveformReplay({ run }: { run: RunResult }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const waveRef = useRef<WaveSurfer | null>(null);
  const bars = useMemo(
    () =>
      Array.from({ length: 72 }, (_, index) => {
        const value = Math.sin(index * 1.7) * 18 + Math.cos(index * 0.42) * 12 + 38;
        return Math.max(10, Math.min(72, Math.round(value)));
      }),
    [run.id]
  );

  useEffect(() => {
    let cancelled = false;
    const audioUrl = run.audioUrl;
    if (!audioUrl || !containerRef.current) {
      return;
    }

    void import("wavesurfer.js").then(({ default: WaveSurferModule }) => {
      if (cancelled || !containerRef.current) {
        return;
      }
      waveRef.current?.destroy();
      waveRef.current = WaveSurferModule.create({
        container: containerRef.current,
        waveColor: "rgba(238,235,228,0.28)",
        progressColor: "#c9b896",
        cursorColor: "#eeebe4",
        height: 96,
        barWidth: 2,
        barGap: 3,
        url: audioUrl
      });
    });

    return () => {
      cancelled = true;
      waveRef.current?.destroy();
      waveRef.current = null;
    };
  }, [run.audioUrl, run.id]);

  if (run.audioUrl) {
    return <div ref={containerRef} className="min-h-24 w-full" />;
  }

  return (
    <div className="flex h-24 items-center gap-1 overflow-hidden rounded-[18px] border border-[var(--line)] bg-black/20 px-4" aria-label="Generated waveform preview">
      {bars.map((height, index) => (
        <div
          key={`${run.id}-${index}`}
          className="w-[3px] rounded-full bg-[var(--accent)]/70"
          style={{ height }}
        />
      ))}
      <div className="ml-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Transcript replay</div>
    </div>
  );
}
