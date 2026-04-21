---
inclusion: fileMatch
fileMatchPattern: ["apps/web/**/*.tsx", "apps/web/**/*.css"]
---

# UI Steering

Use a minimalist Czarflix editorial product style:

- warm off-white canvas
- charcoal text
- crisp 1px borders
- 8-12px radii
- sparse controls
- one primary action per stage
- serif only for decisive titles
- sans for operational UI
- restrained semantic red, amber, and green
- no purple AI gradients
- no dense dark cockpit
- no fake waveform when no audio exists
- no generic landing page as the first screen

The first screen should show the working product flow:

`Spec -> Run -> Failure -> Audio -> Shrink -> Kiro Task -> Green`

Desktop should use a centered workspace with the transcript and audio evidence as the hero. Mobile should be a strict single-column sequence with a sticky primary action. Every result needs a visible provenance label: `ElevenLabs simulation`, `Recorded ElevenLabs call`, `Generated replay`, or `Demo fixture`.
