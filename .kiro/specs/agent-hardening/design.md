# Agent Hardening Design

## Overview

This spec folder is exported by VoiceGauntlet after a failed run. It converts a concrete ElevenLabs simulation failure into Kiro-ready remediation work.

## Flow

1. VoiceGauntlet maps the failed run to the original requirement ID.
2. The shrinker minimizes the transcript while preserving the failed criterion.
3. The exporter writes a concrete task with evidence, repro command, and acceptance check.
4. Kiro applies the task to the agent prompt/tool policy.
5. VoiceGauntlet reruns the same scenario and expects green criteria.

## Evidence Rules

- Transcript evidence is always valid for simulation failures.
- Generated replay audio may support demo review, but it is not a recorded call.
- Recorded-call wording is reserved for ElevenLabs conversation audio with confirmed user and response audio.
