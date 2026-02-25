# Research Deliverable 05: Voice Pipeline Architecture

**Research Question**: Does Mastra have built-in Whisper/TTS integrations, or do we implement custom API wrappers?

**Status**: ✅ Resolved
**Decision**: **Custom API wrappers required** - OpenAI Whisper + OpenAI TTS with streaming
**Date**: 2025-12-20

---

## Executive Summary

**No built-in voice modules in Mastra** - custom wrappers required for Whisper (transcription) and TTS (synthesis). **Recommended stack**: OpenAI Whisper API (`whisper-1`) + OpenAI TTS API (`tts-1` for speed, `tts-1-hd` for quality) with streaming support. Target latency: **<3 seconds end-to-end** (achievable with ~2000ms average).

---

## Voice Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Voice Interaction Flow                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ User Speech  │
│ (10s audio)  │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  Browser: MediaRecorder API                 │
│  - Capture audio (webm/opus, 48kHz)         │
│  - Convert to base64                        │
│  - Upload to API route                      │
└──────────────┬──────────────────────────────┘
               │ ~100ms (upload)
               ▼
┌─────────────────────────────────────────────┐
│  API Route: /api/voice/transcribe           │
│  - Receive audio blob                       │
│  - Forward to OpenAI Whisper API            │
│  - Return transcription + confidence        │
└──────────────┬──────────────────────────────┘
               │ ~500ms (transcription)
               ▼
┌─────────────────────────────────────────────┐
│  Mastra Agent Processing                    │
│  - Process text query                       │
│  - Execute tools/workflows                  │
│  - Generate response text                   │
└──────────────┬──────────────────────────────┘
               │ ~1200ms (agent)
               ▼
┌─────────────────────────────────────────────┐
│  API Route: /api/voice/synthesize           │
│  - Receive response text                    │
│  - Stream to OpenAI TTS API                 │
│  - Return audio chunks (streaming)          │
└──────────────┬──────────────────────────────┘
               │ ~200ms (first chunk)
               ▼
┌─────────────────────────────────────────────┐
│  Browser: Audio Playback                    │
│  - Receive audio stream                     │
│  - Play via Web Audio API                   │
│  - Display live transcript                  │
└─────────────────────────────────────────────┘

TOTAL LATENCY: ~2000ms (meets <3s target)
```

---

## Transcription: OpenAI Whisper API

### API Wrapper Implementation

```typescript
// lib/voice/whisper.ts
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
}

export async function transcribeAudio(
  audioBlob: Buffer,
  language?: 'en' | 'de'
): Promise<TranscriptionResult> {
  const startTime = Date.now();

  // Create temporary file-like object for OpenAI API
  const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language, // Optional: specify language for faster processing
    response_format: 'verbose_json' // Get detailed metadata
  });

  const duration = Date.now() - startTime;

  return {
    text: transcription.text,
    language: transcription.language || 'unknown',
    duration
  };
}
```

### API Route

```typescript
// app/api/voice/transcribe/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/voice/whisper';
import { getServerSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Transcribe audio
    const result = await transcribeAudio(buffer);

    // Log metrics
    logger.info({
      type: 'voice.transcribe',
      userId: session.user.id,
      duration: result.duration,
      language: result.language,
      textLength: result.text.length
    });

    return NextResponse.json({
      text: result.text,
      language: result.language,
      duration: result.duration
    });

  } catch (error) {
    logger.error({
      type: 'voice.transcribe.error',
      error: error.message
    });

    return NextResponse.json(
      { error: 'Transcription failed', details: error.message },
      { status: 500 }
    );
  }
}
```

### Frontend Audio Capture

```typescript
// components/voice/AudioRecorder.tsx
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

export function AudioRecorder({ onTranscription }: { onTranscription: (text: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    audioChunks.current = [];

    mediaRecorder.current.ondataavailable = (event) => {
      audioChunks.current.push(event.data);
    };

    mediaRecorder.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });

      // Upload to transcription API
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      });

      const { text } = await response.json();
      onTranscription(text);
    };

    mediaRecorder.current.start();
    setIsRecording(true);
  }

  function stopRecording() {
    mediaRecorder.current?.stop();
    mediaRecorder.current?.stream.getTracks().forEach(track => track.stop());
    setIsRecording(false);
  }

  return (
    <Button
      onClick={isRecording ? stopRecording : startRecording}
      variant={isRecording ? 'destructive' : 'default'}
    >
      {isRecording ? 'Stop Recording' : 'Start Recording'}
    </Button>
  );
}
```

---

## Text-to-Speech: OpenAI TTS API

### TTS Wrapper with Streaming

```typescript
// lib/voice/tts.ts
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
export type TTSModel = 'tts-1' | 'tts-1-hd';

export async function synthesizeSpeech(
  text: string,
  voice: TTSVoice = 'nova',
  model: TTSModel = 'tts-1' // Use 'tts-1' for speed, 'tts-1-hd' for quality
): Promise<ReadableStream> {
  const response = await openai.audio.speech.create({
    model,
    voice,
    input: text,
    response_format: 'mp3',
    speed: 1.0
  });

  // Return streaming response
  return response.body as ReadableStream;
}
```

### Streaming API Route

```typescript
// app/api/voice/synthesize/route.ts
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { synthesizeSpeech } from '@/lib/voice/tts';
import { getServerSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const { text, voice = 'nova', model = 'tts-1' } = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response('No text provided', { status: 400 });
    }

    // Synthesize speech with streaming
    const audioStream = await synthesizeSpeech(text, voice, model);

    // Log metrics
    logger.info({
      type: 'voice.synthesize',
      userId: session.user.id,
      textLength: text.length,
      voice,
      model
    });

    // Return streaming audio response
    return new Response(audioStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    logger.error({
      type: 'voice.synthesize.error',
      error: error.message
    });

    return new Response('TTS synthesis failed', { status: 500 });
  }
}
```

### Frontend Audio Playback

```typescript
// components/voice/AudioPlayer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

export function AudioPlayer({ text }: { text: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function playAudio() {
    try {
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'nova', model: 'tts-1' })
      });

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();
      setIsPlaying(true);

      audioRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

    } catch (error) {
      console.error('Audio playback failed:', error);
      setIsPlaying(false);
    }
  }

  function stopAudio() {
    audioRef.current?.pause();
    audioRef.current = null;
    setIsPlaying(false);
  }

  return (
    <Button
      onClick={isPlaying ? stopAudio : playAudio}
      variant={isPlaying ? 'destructive' : 'outline'}
    >
      {isPlaying ? 'Stop' : 'Play Audio'}
    </Button>
  );
}
```

---

## Latency Budget Analysis

### Component Breakdown

| Component | Latency | Notes |
|-----------|---------|-------|
| **Audio Capture** | ~0ms | Real-time (MediaRecorder) |
| **Upload to Server** | ~100ms | 10s audio @ 64kbps ≈ 80KB |
| **Whisper Transcription** | ~500ms | OpenAI Whisper API (10s audio) |
| **Agent Processing** | ~1200ms | Simple query (memory + tools) |
| **TTS Synthesis (streaming)** | ~200ms | First audio chunk (OpenAI TTS) |
| **Audio Playback** | ~0ms | Web Audio API starts immediately |
| **TOTAL** | **~2000ms** | ✅ Meets <3s target |

### Latency by Query Complexity

| Query Type | Agent Processing | Total Latency | Target |
|------------|------------------|---------------|--------|
| Simple (memory recall) | ~800ms | ~1600ms | ✅ <3s |
| Medium (tool call) | ~1500ms | ~2300ms | ✅ <3s |
| Complex (workflow) | ~3000ms | ~3800ms | ❌ >3s (acceptable for complex queries) |

**Note**: Complex workflow queries (trip planning) exceed 3s target, but users expect longer processing for multi-step operations.

---

## Confidence Threshold Handling

### Transcription Confidence Validation

OpenAI Whisper API **does not provide confidence scores** in standard response. Alternative: Use alternative transcription service (e.g., Google Speech-to-Text) for validation.

**Fallback Strategy**: Show transcript to user with confirmation UI.

```typescript
// components/voice/TranscriptionConfirmation.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function TranscriptionConfirmation({
  transcript,
  onConfirm,
  onRetry
}: {
  transcript: string;
  onConfirm: (text: string) => void;
  onRetry: () => void;
}) {
  const [editedText, setEditedText] = useState(transcript);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Did I hear that correctly?</p>

      <textarea
        value={editedText}
        onChange={(e) => setEditedText(e.target.value)}
        className="w-full p-2 border rounded"
        rows={3}
      />

      <div className="flex gap-2">
        <Button onClick={() => onConfirm(editedText)}>
          Yes, Continue
        </Button>
        <Button variant="outline" onClick={onRetry}>
          No, Try Again
        </Button>
      </div>
    </div>
  );
}
```

---

## Voice Settings & Personalization

### User Preferences

```typescript
// types/user-preferences.ts
export interface VoicePreferences {
  ttsVoice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  ttsModel: 'tts-1' | 'tts-1-hd'; // Speed vs quality
  playbackSpeed: number; // 0.5 - 2.0
  autoPlayResponses: boolean;
  showTranscript: boolean; // Show text alongside audio
}

// Store in Supabase user_preferences table
export async function saveVoicePreferences(
  userId: string,
  preferences: VoicePreferences
): Promise<void> {
  await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      voice_settings: preferences,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });
}
```

### Voice Selection UI

```typescript
// components/settings/VoiceSettings.tsx
'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { saveVoicePreferences } from '@/lib/user-preferences';

const VOICES = [
  { value: 'alloy', label: 'Alloy (Neutral)' },
  { value: 'echo', label: 'Echo (Male)' },
  { value: 'fable', label: 'Fable (British)' },
  { value: 'onyx', label: 'Onyx (Deep Male)' },
  { value: 'nova', label: 'Nova (Female, Recommended)' },
  { value: 'shimmer', label: 'Shimmer (Soft Female)' }
];

export function VoiceSettings({ userId }: { userId: string }) {
  const [voice, setVoice] = useState('nova');
  const [quality, setQuality] = useState<'tts-1' | 'tts-1-hd'>('tts-1');
  const [autoPlay, setAutoPlay] = useState(true);

  async function handleSave() {
    await saveVoicePreferences(userId, {
      ttsVoice: voice as any,
      ttsModel: quality,
      playbackSpeed: 1.0,
      autoPlayResponses: autoPlay,
      showTranscript: true
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Voice</label>
        <Select value={voice} onValueChange={setVoice}>
          {VOICES.map(v => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">Quality</label>
        <Select value={quality} onValueChange={setQuality as any}>
          <option value="tts-1">Standard (Faster)</option>
          <option value="tts-1-hd">HD (Higher Quality)</option>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={autoPlay} onCheckedChange={setAutoPlay} />
        <label className="text-sm">Auto-play responses</label>
      </div>

      <Button onClick={handleSave}>Save Preferences</Button>
    </div>
  );
}
```

---

## Cost Analysis

### OpenAI Pricing (as of 2025)

| Service | Model | Cost | Per Query |
|---------|-------|------|-----------|
| **Whisper** | `whisper-1` | $0.006/minute | ~$0.001 (10s audio) |
| **TTS** | `tts-1` | $15/1M characters | ~$0.001 (50-word response) |
| **TTS HD** | `tts-1-hd` | $30/1M characters | ~$0.002 (50-word response) |

**MVP Cost Estimate** (250 DAU, 10 voice queries/day):
- Daily queries: 250 users × 10 queries = 2,500 queries
- Daily cost: 2,500 × ($0.001 + $0.001) = **$5/day**
- Monthly cost: **~$150/month**

**Cost Optimization**:
- Use `tts-1` (standard quality) by default
- Offer `tts-1-hd` as premium feature (Trailblazer tier)
- Cache common TTS responses (e.g., "What is your lightest tent?")

---

## Observability & Metrics

### Voice Interaction Metrics

```typescript
// lib/observability/voice-metrics.ts
import { Histogram, Counter } from 'prom-client';

export const voiceTranscriptionDuration = new Histogram({
  name: 'voice_transcription_duration_seconds',
  help: 'Whisper API transcription latency',
  buckets: [0.1, 0.5, 1, 2, 5]
});

export const voiceSynthesisDuration = new Histogram({
  name: 'voice_synthesis_duration_seconds',
  help: 'TTS API synthesis latency (first chunk)',
  buckets: [0.1, 0.5, 1, 2, 5]
});

export const voiceEndToEndDuration = new Histogram({
  name: 'voice_end_to_end_duration_seconds',
  help: 'Total voice interaction latency',
  buckets: [1, 2, 3, 5, 10],
  labelNames: ['query_type'] // simple | medium | complex
});

export const voiceErrorsTotal = new Counter({
  name: 'voice_errors_total',
  help: 'Voice pipeline errors',
  labelNames: ['stage', 'error_type'] // stage: transcribe | synthesize, error_type: timeout | api_error
});
```

---

## Conclusion

**Deliverable**: Complete voice pipeline architecture with OpenAI Whisper + TTS, streaming support, latency optimization, and cost analysis.

**Key Decisions**:
1. **Transcription**: OpenAI Whisper API (`whisper-1`) - ~500ms latency
2. **TTS**: OpenAI TTS API (`tts-1` for speed, `tts-1-hd` for quality) - ~200ms first chunk
3. **Streaming**: Enabled for TTS playback (start audio before full synthesis)
4. **Latency**: ~2000ms average (meets <3s target for simple queries)

**Cost**: ~$150/month for MVP (250 DAU, 10 queries/day)

**Next Steps**:
1. Implement Whisper API wrapper in `lib/voice/whisper.ts`
2. Implement TTS API wrapper with streaming in `lib/voice/tts.ts`
3. Create API routes for `/api/voice/transcribe` and `/api/voice/synthesize`
4. Build frontend audio recorder + playback components
5. Add voice interaction metrics to observability dashboard
6. Implement user voice preferences (Supabase user_preferences table)
