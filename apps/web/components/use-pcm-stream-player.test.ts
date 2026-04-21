import { describe, expect, it } from "vitest";
import { pcm16ToFloat32 } from "./use-pcm-stream-player";

describe("PCM stream player helpers", () => {
  it("converts signed little-endian PCM16 samples to normalized floats", () => {
    const bytes = new Uint8Array([0x00, 0x80, 0x00, 0x00, 0xff, 0x7f]);
    const samples = pcm16ToFloat32(bytes);

    expect(samples).toHaveLength(3);
    expect(samples[0]).toBe(-1);
    expect(samples[1]).toBe(0);
    expect(samples[2]).toBeCloseTo(0.9999, 3);
  });
});
