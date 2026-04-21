---
inclusion: fileMatch
fileMatchPattern: ["apps/web/**/*.tsx", "apps/web/**/*.css"]
---

# UI Steering

Use a minimalist Taste-style product system copied/adapted from the owner's `czarflix/taste-skill` rules:

- warm off-white canvas
- charcoal text
- crisp 1px borders
- 6-10px radii
- sparse controls
- one primary action per stage
- serif only for decisive proof titles
- geometric sans for operational UI
- tabular numbers for counts, timing, confidence, and chunks
- restrained semantic red, amber, and green
- no purple AI gradients
- no dense dark cockpit
- no generic SaaS card spam
- no large pill buttons except tiny provenance/status chips
- no fake waveform when no audio exists
- no generic landing page as the first screen

The first screen should show the working product flow:

`Spec -> Run -> Failure -> Forensic Replay -> Shrink -> Kiro Task -> Green`

Desktop should use a centered workspace with the transcript and audio evidence as the hero. Mobile should be a strict single-column sequence with a sticky primary action. Every result needs a visible provenance label: `ElevenLabs simulation`, `Recorded ElevenLabs call`, `Generated replay`, or `Demo fixture`.

Live Monitor styling:

- show it as a quiet proof strip, not a debug console
- labels must read `Live agent stream`, `Customer audio: synthetic caller`, and `Agent audio: ElevenLabs WebSocket`
- show conversation ID, caller chunks, agent chunks, and recorded-call check without exposing raw provider payloads
- never call transient WebSocket chunks a recorded call
