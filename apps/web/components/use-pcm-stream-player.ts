"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { PcmAudioFormat } from "@voicegauntlet/core/live-websocket";

export type PcmStreamPlayer = {
  muted: boolean;
  error: string | null;
  queuedChunks: number;
  start: () => Promise<void>;
  stop: () => void;
  setMuted: (muted: boolean) => void;
  playPcmBytes: (bytes: ArrayBuffer | Uint8Array, format: PcmAudioFormat) => Promise<void>;
  playBase64Pcm: (base64: string, format: PcmAudioFormat) => Promise<number>;
};

export function usePcmStreamPlayer(): PcmStreamPlayer {
  const contextRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const nextStartRef = useRef(0);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const mutedRef = useRef(false);
  const [mutedState, setMutedState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuedChunks, setQueuedChunks] = useState(0);

  const setMuted = useCallback((nextMuted: boolean) => {
    mutedRef.current = nextMuted;
    setMutedState(nextMuted);
    if (gainRef.current) {
      gainRef.current.gain.value = nextMuted ? 0 : 1;
    }
  }, []);

  const start = useCallback(async () => {
    const context = getOrCreateContext(contextRef, gainRef, mutedRef.current);
    if (context.state === "suspended") {
      await context.resume();
    }
    nextStartRef.current = Math.max(nextStartRef.current, context.currentTime + 0.08);
    setError(null);
  }, []);

  const stop = useCallback(() => {
    for (const source of sourcesRef.current) {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    }
    sourcesRef.current = [];
    const context = contextRef.current;
    if (context) {
      nextStartRef.current = context.currentTime;
    }
    setQueuedChunks(0);
  }, []);

  const playPcmBytes = useCallback(
    async (bytes: ArrayBuffer | Uint8Array, format: PcmAudioFormat) => {
      if (format.codec !== "pcm_s16le" || format.channels !== 1) {
        setError(`Unsupported live audio format: ${format.source}`);
        return;
      }
      await start();
      if (mutedRef.current) {
        return;
      }
      const context = getOrCreateContext(contextRef, gainRef, mutedRef.current);
      const samples = pcm16ToFloat32(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
      if (samples.length === 0) {
        return;
      }
      const buffer = context.createBuffer(1, samples.length, format.sampleRate);
      buffer.copyToChannel(samples, 0);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(gainRef.current ?? context.destination);
      const startTime = Math.max(context.currentTime + 0.08, nextStartRef.current);
      nextStartRef.current = startTime + buffer.duration;
      sourcesRef.current.push(source);
      setQueuedChunks((current) => current + 1);
      source.onended = () => {
        sourcesRef.current = sourcesRef.current.filter((item) => item !== source);
        setQueuedChunks((current) => Math.max(0, current - 1));
      };
      source.start(startTime);
    },
    [start]
  );

  const playBase64Pcm = useCallback(
    async (base64: string, format: PcmAudioFormat) => {
      const bytes = base64ToBytes(base64);
      await playPcmBytes(bytes, format);
      return bytes.byteLength;
    },
    [playPcmBytes]
  );

  useEffect(() => {
    return () => {
      stop();
      void contextRef.current?.close();
      contextRef.current = null;
      gainRef.current = null;
    };
  }, [stop]);

  return {
    muted: mutedState,
    error,
    queuedChunks,
    start,
    stop,
    setMuted,
    playPcmBytes,
    playBase64Pcm
  };
}

export function pcm16ToFloat32(bytes: Uint8Array): Float32Array<ArrayBuffer> {
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const output = new Float32Array(new ArrayBuffer(sampleCount * Float32Array.BYTES_PER_ELEMENT));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let index = 0; index < sampleCount; index += 1) {
    output[index] = Math.max(-1, Math.min(1, view.getInt16(index * 2, true) / 32768));
  }
  return output;
}

function getOrCreateContext(
  contextRef: MutableRefObject<AudioContext | null>,
  gainRef: MutableRefObject<GainNode | null>,
  muted: boolean
) {
  if (!contextRef.current || contextRef.current.state === "closed") {
    contextRef.current = new AudioContext();
    gainRef.current = contextRef.current.createGain();
    gainRef.current.gain.value = muted ? 0 : 1;
    gainRef.current.connect(contextRef.current.destination);
  }
  return contextRef.current;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
