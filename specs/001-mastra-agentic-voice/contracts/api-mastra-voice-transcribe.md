# API Contract: Voice Transcription Endpoint

**Endpoint**: `POST /api/mastra/voice/transcribe`
**Version**: 1.0.0
**Created**: 2025-12-20

---

## Overview

Transcribes audio input to text using Whisper or Vercel AI SDK transcription for voice-enabled AI interactions.

---

## Request

### HTTP Method
`POST`

### URL
```
/api/mastra/voice/transcribe
```

### Headers

| Header | Required | Value | Description |
|--------|----------|-------|-------------|
| `Content-Type` | Yes | `multipart/form-data` | Audio file upload |
| `Authorization` | Yes | `Bearer <token>` | Supabase Auth JWT |

### Authentication

**Required**: Yes

Uses existing Supabase authentication. The JWT token must be valid and contain a `user_id` claim.

**Unauthorized Response**:
```json
{
  "error": "Unauthorized",
  "message": "Valid authentication required"
}
```
Status: `401 Unauthorized`

---

### Request Body (Multipart Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audio` | File | Yes | Audio file (WAV, MP3, M4A, WEBM, OGG) |
| `language` | String | No | ISO 639-1 language code (default: auto-detect) |
| `options` | JSON | No | Transcription options |

#### Supported Audio Formats

| Format | MIME Type | Max Size |
|--------|-----------|----------|
| WAV | `audio/wav` | 25 MB |
| MP3 | `audio/mpeg` | 25 MB |
| M4A | `audio/m4a` | 25 MB |
| WEBM | `audio/webm` | 25 MB |
| OGG | `audio/ogg` | 25 MB |

#### Options Schema

```typescript
interface TranscriptionOptions {
  model?: 'whisper-1';          // Whisper model variant
  temperature?: number;         // 0.0-1.0 (controls randomness)
  prompt?: string;              // Context hint for better accuracy
}
```

### Example Request (using FormData)

```typescript
const formData = new FormData();
formData.append('audio', audioFile); // File object from <input type="file">
formData.append('language', 'en');
formData.append('options', JSON.stringify({
  model: 'whisper-1',
  temperature: 0.2,
  prompt: 'Gear, tent, backpack, hiking, camping'
}));

const response = await fetch('/api/mastra/voice/transcribe', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: formData,
});
```

### Example cURL Request

```bash
curl -X POST https://gearshack.app/api/mastra/voice/transcribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "audio=@recording.wav" \
  -F "language=en" \
  -F 'options={"model":"whisper-1","temperature":0.2}'
```

---

## Response

### Success Response

**Status**: `200 OK`

**Content-Type**: `application/json`

```typescript
interface TranscriptionResponse {
  text: string;                 // Transcribed text
  confidence: number;           // 0.0-1.0 (transcription confidence)
  language: string;             // Detected language (ISO 639-1)
  duration: number;             // Audio duration in seconds
  metadata: {
    provider: 'whisper' | 'vercel-ai-sdk';
    model: string;
    processingTimeMs: number;
  };
}
```

### Example Success Response

```json
{
  "text": "What's the total weight of my tent, sleeping bag, and sleeping pad?",
  "confidence": 0.97,
  "language": "en",
  "duration": 4.2,
  "metadata": {
    "provider": "whisper",
    "model": "whisper-1",
    "processingTimeMs": 1234
  }
}
```

---

## Rate Limiting

### Voice Operation Limits

| Tier | Limit | Window | Notes |
|------|-------|--------|-------|
| Voice (Transcription + TTS) | 40 requests/hour | 3600s | Combined with `/api/mastra/voice/synthesize` |

### Rate Limit Exceeded Response

**Status**: `429 Too Many Requests`

**Headers**:
```
Retry-After: 2456
X-RateLimit-Limit: 40
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1735646400
```

**Body**:
```json
{
  "error": "RateLimitExceeded",
  "message": "Voice requests limited to 40 per hour. Try again in 41 minutes.",
  "operationType": "voice",
  "retryAfter": 2456,
  "resetAt": "2025-12-20T15:00:00Z"
}
```

---

## Error Responses

### 400 Bad Request

**Missing audio file**:
```json
{
  "error": "ValidationError",
  "message": "Audio file is required",
  "field": "audio"
}
```

**Invalid audio format**:
```json
{
  "error": "ValidationError",
  "message": "Unsupported audio format. Supported formats: WAV, MP3, M4A, WEBM, OGG",
  "field": "audio"
}
```

**File too large**:
```json
{
  "error": "ValidationError",
  "message": "Audio file exceeds maximum size of 25 MB",
  "field": "audio",
  "maxSizeBytes": 26214400
}
```

### 401 Unauthorized

**Missing or invalid auth token**:
```json
{
  "error": "Unauthorized",
  "message": "Valid authentication required"
}
```

### 422 Unprocessable Entity

**Low confidence transcription**:
```json
{
  "error": "LowConfidence",
  "message": "Transcription confidence below threshold. Please try again in a quieter environment.",
  "confidence": 0.42,
  "threshold": 0.70,
  "partialText": "whats the... [unclear] ...weight"
}
```

### 500 Internal Server Error

**Whisper API failure**:
```json
{
  "error": "TranscriptionFailed",
  "message": "Failed to transcribe audio. Please try again.",
  "details": "Whisper API timeout after 30s"
}
```

### 503 Service Unavailable

**Transcription service down**:
```json
{
  "error": "ServiceUnavailable",
  "message": "Voice transcription temporarily unavailable. Please use text input.",
  "estimatedRecoveryTime": "2025-12-20T15:30:00Z"
}
```

---

## Performance Targets

| Metric | Target | P99 |
|--------|--------|-----|
| **Transcription Latency** | < 2s | < 5s |
| **Accuracy (Clear Speech)** | > 95% | > 90% |
| **Accuracy (Noisy Environment)** | > 80% | > 70% |
| **Confidence Score** | > 0.85 | > 0.70 |

---

## Confidence Threshold Behavior

| Confidence Range | Behavior |
|------------------|----------|
| **0.90 - 1.00** | ✅ High confidence - proceed normally |
| **0.70 - 0.89** | ⚠️ Medium confidence - display warning, allow user to confirm |
| **0.00 - 0.69** | ❌ Low confidence - return 422 error, ask user to repeat |

**Frontend Handling**:
```typescript
if (response.confidence < 0.70) {
  toast.error("I didn't catch that. Please try again in a quieter place.");
} else if (response.confidence < 0.90) {
  toast.warning(`I heard: "${response.text}". Is this correct?`);
}
```

---

## Observability

### Structured Logging

**Transcription Request Log** (JSON format):
```json
{
  "timestamp": "2025-12-20T14:30:00.123Z",
  "level": "info",
  "service": "mastra-voice-transcribe",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "transcription_completed",
  "metadata": {
    "audioFormat": "audio/wav",
    "audioSizeBytes": 524288,
    "audioDurationSeconds": 4.2,
    "transcriptionText": "What's the total weight of my tent?",
    "confidence": 0.97,
    "language": "en",
    "processingTimeMs": 1234,
    "provider": "whisper",
    "model": "whisper-1"
  }
}
```

### Metrics Exported

**Prometheus Format** (via `/api/mastra/metrics`):
```
mastra_voice_transcriptions_total{provider="whisper"} 456
mastra_voice_transcription_latency_ms{quantile="0.5"} 1200
mastra_voice_transcription_latency_ms{quantile="0.95"} 3500
mastra_voice_transcription_latency_ms{quantile="0.99"} 7800
mastra_voice_transcription_confidence{quantile="0.5"} 0.95
mastra_voice_transcription_confidence{quantile="0.95"} 0.87
mastra_voice_transcription_errors_total{error_type="low_confidence"} 23
mastra_voice_transcription_errors_total{error_type="api_timeout"} 5
```

---

## Frontend Integration

### Voice Recording Component

```typescript
import { useState, useRef } from 'react';
import { toast } from 'sonner';

export function VoiceRecorder({ onTranscription }: { onTranscription: (text: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    const audioChunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      await transcribeAudio(audioBlob);
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setIsTranscribing(true);
  }

  async function transcribeAudio(audioBlob: Blob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('language', 'en');

    try {
      const response = await fetch('/api/mastra/voice/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const result = await response.json();

      if (result.confidence < 0.70) {
        toast.error("I didn't catch that. Please try again.");
        return;
      }

      onTranscription(result.text);

      if (result.confidence < 0.90) {
        toast.warning(`I heard: "${result.text}". Is this correct?`);
      }
    } catch (error) {
      toast.error('Transcription failed. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  }

  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      disabled={isTranscribing}
    >
      {isRecording ? 'Stop Recording' : isTranscribing ? 'Transcribing...' : 'Start Recording'}
    </button>
  );
}
```

---

## Security Considerations

1. **Authentication**: All transcription requests require valid Supabase JWT
2. **Rate Limiting**: 40 requests/hour to prevent abuse and cost overruns
3. **File Size Limits**: Max 25 MB per audio file
4. **Format Validation**: Only whitelisted audio formats accepted
5. **Privacy**: Audio files not stored permanently (processed and discarded)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-20 | Initial contract definition |
