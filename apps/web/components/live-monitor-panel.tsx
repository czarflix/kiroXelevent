"use client";

import { Radio, Square, Volume2, VolumeX } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  buildElevenLabsPong,
  parseElevenLabsLiveEvent,
  parsePcmAudioFormat,
  type AudioEvidence,
  type PcmAudioFormat
} from "@voicegauntlet/core/live-websocket";
import { usePcmStreamPlayer } from "./use-pcm-stream-player";

type LiveTranscriptTurn = {
  role: "user" | "agent";
  message: string;
};

type SignedUrlResponse = {
  signedUrl?: string;
  error?: string;
};

type AudioProbeResponse = {
  conversationId?: string | null;
  audioEvidence?: AudioEvidence;
  warning?: string | null;
  error?: string;
};

type LiveStatus = "idle" | "preparing" | "connecting" | "streaming" | "closed" | "error";

const fallbackLiveFormat = parsePcmAudioFormat("pcm_16000")!;

export function LiveMonitorPanel({
  agentId,
  callerText,
  disabled = false,
  onProbeComplete
}: {
  agentId: string;
  callerText: string;
  disabled?: boolean;
  onProbeComplete?: (probe: AudioProbeResponse) => void;
}) {
  const player = usePcmStreamPlayer();
  const socketRef = useRef<WebSocket | null>(null);
  const stoppedRef = useRef(false);
  const agentFormatRef = useRef<PcmAudioFormat | null>(fallbackLiveFormat);
  const conversationIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<LiveTranscriptTurn[]>([]);
  const [callerChunks, setCallerChunks] = useState(0);
  const [agentChunks, setAgentChunks] = useState(0);
  const [agentBytes, setAgentBytes] = useState(0);
  const [message, setMessage] = useState("Ready to hear a synthetic caller and the ElevenLabs agent stream.");
  const [recordedCheck, setRecordedCheck] = useState<AudioEvidence | null>(null);

  const canStart = !disabled && status !== "preparing" && status !== "connecting" && status !== "streaming" && Boolean(agentId.trim());

  const stop = useCallback(() => {
    stoppedRef.current = true;
    socketRef.current?.close();
    socketRef.current = null;
    player.stop();
    setStatus((current) => (current === "idle" ? "idle" : "closed"));
    setMessage("Live monitor stopped. Transient chunks are not labeled as a recorded call.");
  }, [player]);

  const start = useCallback(async () => {
    if (!agentId.trim()) {
      setStatus("error");
      setMessage("Enter an ElevenLabs agent ID before starting the live monitor.");
      return;
    }

    stop();
    stoppedRef.current = false;
    agentFormatRef.current = fallbackLiveFormat;
    conversationIdRef.current = null;
    setStatus("preparing");
    setConversationId(null);
    setTranscript([]);
    setCallerChunks(0);
    setAgentChunks(0);
    setAgentBytes(0);
    setRecordedCheck(null);
    setMessage("Preparing signed URL and synthetic caller audio.");

    try {
      await player.start();
      const [signedResponse, callerResponse] = await Promise.all([
        fetch("/api/elevenlabs/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId })
        }),
        fetch("/api/elevenlabs/caller-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: callerText, outputFormat: "pcm_16000" })
        })
      ]);

      const signed = (await signedResponse.json().catch(() => ({}))) as SignedUrlResponse;
      if (!signedResponse.ok || !signed.signedUrl) {
        throw new Error(signed.error ?? "Could not create ElevenLabs signed URL.");
      }
      if (!callerResponse.ok) {
        const payload = (await callerResponse.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Could not generate synthetic caller audio.");
      }

      const callerFormat = parsePcmAudioFormat(callerResponse.headers.get("X-VoiceGauntlet-Audio-Format")) ?? fallbackLiveFormat;
      const callerAudio = new Uint8Array(await callerResponse.arrayBuffer());
      await player.playPcmBytes(callerAudio, callerFormat);
      setStatus("connecting");
      setMessage("Opening ElevenLabs WebSocket. Customer audio is playing locally and being sent to the agent.");

      const socket = new WebSocket(signed.signedUrl);
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        if (stoppedRef.current) {
          socket.close();
          return;
        }
        setStatus("streaming");
        setMessage("Live agent stream is active.");
        void sendPcmChunksPaced(socket, callerAudio, {
          onChunk: () => setCallerChunks((current) => current + 1),
          shouldContinue: () => !stoppedRef.current
        });
      });

      socket.addEventListener("message", (event) => {
        void handleSocketMessage(event.data);
      });

      socket.addEventListener("error", () => {
        setStatus("error");
        setMessage("ElevenLabs WebSocket failed. No live success is being claimed.");
      });

      socket.addEventListener("close", () => {
        socketRef.current = null;
        setStatus((current) => (current === "error" ? "error" : "closed"));
        setMessage("Live stream closed. Checking whether ElevenLabs stored complete recorded-call audio.");
        const id = conversationIdRef.current;
        if (id) {
          void checkRecordedCall(id);
        }
      });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Live monitor failed.");
    }

    async function handleSocketMessage(data: MessageEvent["data"]) {
      const text = typeof data === "string" ? data : await dataToText(data);
      const liveEvent = parseElevenLabsLiveEvent(text);
      if (liveEvent.kind === "metadata") {
        conversationIdRef.current = liveEvent.conversationId;
        setConversationId(liveEvent.conversationId);
        const parsedFormat = parsePcmAudioFormat(liveEvent.agentOutputAudioFormat);
        if (liveEvent.agentOutputAudioFormat && !parsedFormat) {
          agentFormatRef.current = null;
          setMessage(`Unsupported live agent audio format: ${liveEvent.agentOutputAudioFormat}. Transcript remains visible.`);
        } else {
          agentFormatRef.current = parsedFormat ?? fallbackLiveFormat;
        }
        return;
      }
      if (liveEvent.kind === "ping") {
        socketRef.current?.send(buildElevenLabsPong(liveEvent.eventId));
        return;
      }
      if (liveEvent.kind === "user_transcript" && liveEvent.text) {
        setTranscript((current) => [...current, { role: "user", message: liveEvent.text }]);
        return;
      }
      if (liveEvent.kind === "agent_response" && liveEvent.text) {
        setTranscript((current) => [...current, { role: "agent", message: liveEvent.text }]);
        return;
      }
      if (liveEvent.kind === "agent_response_correction" && liveEvent.text) {
        setTranscript((current) => [...current, { role: "agent", message: liveEvent.text }]);
        return;
      }
      if (liveEvent.kind === "audio" && liveEvent.audioBase64) {
        const format = agentFormatRef.current;
        if (!format) {
          setStatus("error");
          return;
        }
        const bytes = await player.playBase64Pcm(liveEvent.audioBase64, format);
        setAgentChunks((current) => current + 1);
        setAgentBytes((current) => current + bytes);
        return;
      }
      if (liveEvent.kind === "interruption") {
        player.stop();
      }
    }

    async function checkRecordedCall(id: string) {
      try {
        const response = await fetch("/api/gauntlet/audio-probe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: id, includeAudio: true })
        });
        const payload = (await response.json().catch(() => ({}))) as AudioProbeResponse;
        if (!response.ok) {
          setMessage(payload.error ?? "Recorded-call check failed.");
          return;
        }
        setRecordedCheck(payload.audioEvidence ?? null);
        onProbeComplete?.(payload);
        setMessage(payload.audioEvidence?.warning ?? "Live stream closed. Recorded-call metadata check completed.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Recorded-call check failed.");
      }
    }
  }, [agentId, callerText, onProbeComplete, player, stop]);

  const statusLabel = useMemo(() => liveStatusLabel(status), [status]);

  return (
    <section className="live-monitor-panel" aria-label="Live Monitor">
      <div className="monitor-topline">
        <div>
          <div className="micro-label">Live Monitor</div>
          <h3>Live agent stream</h3>
        </div>
        <div className={`monitor-status ${status}`}>{statusLabel}</div>
      </div>

      <p className="monitor-copy">{message}</p>

      <div className="monitor-actions">
        <button className="primary-button" type="button" onClick={start} disabled={!canStart}>
          <Radio size={16} />
          Start live monitor
        </button>
        <button className="secondary-button" type="button" onClick={stop} disabled={status === "idle"}>
          <Square size={15} />
          Stop
        </button>
        <button className="secondary-button icon-button" type="button" onClick={() => player.setMuted(!player.muted)} aria-label={player.muted ? "Unmute live monitor" : "Mute live monitor"}>
          {player.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      <div className="monitor-proof-grid">
        <div className="proof-tile">
          <span>Customer audio</span>
          <strong>Synthetic caller</strong>
        </div>
        <div className="proof-tile">
          <span>Agent audio</span>
          <strong>ElevenLabs WebSocket</strong>
        </div>
        <div className="proof-tile">
          <span>Caller chunks</span>
          <strong>{callerChunks}</strong>
        </div>
        <div className="proof-tile">
          <span>Agent chunks</span>
          <strong>{agentChunks}</strong>
        </div>
      </div>

      <div className="provenance-row monitor-provenance">
        <span data-live-conversation-id={conversationId ?? undefined}>{conversationId ? `Conversation ${shortId(conversationId)}` : "No conversation yet"}</span>
        <span>{agentBytes ? `${formatBytes(agentBytes)} agent audio` : "No agent audio yet"}</span>
        <span>{recordedCheck?.source === "recorded_call" ? "Recorded ElevenLabs call verified" : "Recorded call: not claimed"}</span>
      </div>

      {player.error ? <p className="audio-error">{player.error}</p> : null}

      <div className="live-transcript-stream" data-testid="live-monitor-transcript">
        {transcript.length ? (
          transcript.map((turn, index) => (
            <div key={`${turn.role}-${index}`} className={`turn ${turn.role}`}>
              <div>
                <span>{turn.role === "user" ? "customer" : "agent"}</span>
                <time>live</time>
              </div>
              <p>{turn.message}</p>
            </div>
          ))
        ) : (
          <div className="monitor-empty">Transcript appears as ElevenLabs emits live events.</div>
        )}
      </div>
    </section>
  );
}

async function sendPcmChunksPaced(
  socket: WebSocket,
  bytes: Uint8Array,
  options: { onChunk: () => void; shouldContinue: () => boolean }
) {
  const chunkSize = 3200;
  for (let offset = 0; offset < bytes.byteLength; offset += chunkSize) {
    if (!options.shouldContinue() || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.byteLength));
    socket.send(JSON.stringify({ user_audio_chunk: bytesToBase64(chunk) }));
    options.onChunk();
    await delay(90);
  }
  if (options.shouldContinue() && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ user_audio_chunk: bytesToBase64(new Uint8Array(3200)) }));
    options.onChunk();
  }
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }
  return window.btoa(binary);
}

async function dataToText(data: MessageEvent["data"]) {
  if (data instanceof Blob) {
    return data.text();
  }
  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(data);
  }
  return String(data);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function liveStatusLabel(status: LiveStatus) {
  switch (status) {
    case "preparing":
      return "Preparing";
    case "connecting":
      return "Connecting";
    case "streaming":
      return "Streaming";
    case "closed":
      return "Closed";
    case "error":
      return "Error";
    default:
      return "Idle";
  }
}

function shortId(value: string) {
  return value.length > 14 ? `${value.slice(0, 7)}...${value.slice(-4)}` : value;
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }
  return `${(value / 1024).toFixed(1)} KB`;
}
