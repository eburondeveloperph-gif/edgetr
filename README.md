# EdgeTR — Fully Offline Voice-to-Voice Assistant (Flutter)

EdgeTR is a complete rebuild of the voice translation and assistant pipeline designed to run **100% locally on Android and iOS devices**. All speech-to-text, LLM inference, and text-to-speech happen on-device without cloud dependencies, API keys, or active network connections.

---

## Architecture Pipeline

```
[Microphone 16kHz WAV] 
         │
         ▼
[Silero VAD (vad: ^0.0.7+1)] ──(onSpeechEnd)──► [Whisper Edge (whisper.cpp)]
                                                         │
                                                  (User Transcript)
                                                         ▼
                                            [Qwen 2.5 0.5B Instruct GGUF]
                                            (mt_llmkit LocalModel nGpuLayers: 4)
                                                         │
                                                  (Streaming Tokens)
                                                         ▼
                                            [Sentence Boundary Queue]
                                                  (. ! ? \n)
                                                         │
                                                         ▼
                                            [Piper TTS (nl_BE Flemish)]
                                            (nl_BE-rdh / nl_BE-nathalie)
                                                         │
                                                         ▼
                                                   [Device Speaker]
```

### Key Technical Specs

| Component | Model / Engine | Package | Memory / Size | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **STT** | Whisper `baseQ5_1` | `whisper_edge` | ~60 MB | 16kHz mono float32 input via `pcm16ToFloat32` |
| **VAD** | Silero VAD | `vad: ^0.0.7+1` | Embedded | Detects start and end of speech turn |
| **Mic Capture** | WAV 16kHz mono | `record: ^6.2.0` | — | Pinned to `^6.2.0` to resolve conflict with `vad` |
| **LLM** | Qwen 2.5 0.5B Instruct Q4_K_M | `mt_llmkit/llmcpp.dart` | ~398 MB | `LlmConfig(temp: 0.7, nCtx: 2048, nGpuLayers: 4)` |
| **TTS** | Piper Flemish (nl_BE) | `flutter_piper_tts` | ~65 MB | Male: `nl_BE-rdh-medium.onnx`, Female: `nl_BE-nathalie-medium.onnx` |

---

## Dependency Conflict Resolution: `record` & `vad`

- `vad: ^0.0.7+1` requires `record: ^6.1.2` or `^6.2.0`.
- The latest `record` package is 7.x, which creates a pub version conflict.
- **Resolution**: `pubspec.yaml` explicitly pins `record: ^6.2.0` alongside `vad: ^0.0.7+1`.
- **Config**: 
  ```dart
  RecordConfig(
    encoder: AudioEncoder.wav,
    sampleRate: 16000,
    numChannels: 1,
  )
  ```

---

## Model Sources & Download Instructions

The models are downloaded at runtime to the device's application documents directory (`/edgetr_models`) via the built-in **Model Manager** screen or direct CLI commands:

### 1. Whisper baseQ5_1 (~60 MB)
- Downloaded automatically via `WhisperModelDownloader().download(WhisperModel.baseQ5_1, targetDirectory)`
- Alternatively from [ggerganov/whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en-q5_1.bin)

### 2. Qwen 2.5 0.5B Instruct Q4_K_M GGUF (~398 MB)
- Repo: `Qwen/Qwen2.5-0.5B-Instruct-GGUF`
- Direct Link:
  ```
  https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf
  ```

### 3. Piper Flemish (nl_BE) Voices (~65 MB each)
**Important**: Must use `nl_BE` (Belgian Flemish), not Netherlands Dutch. Both the `.onnx` and `.onnx.json` files are required:
- **Male Voice (`rdh`)**:
  - Model: `https://huggingface.co/rhasspy/piper-voices/resolve/main/nl/nl_BE/rdh/medium/nl_BE-rdh-medium.onnx`
  - Config: `https://huggingface.co/rhasspy/piper-voices/resolve/main/nl/nl_BE/rdh/medium/nl_BE-rdh-medium.onnx.json`
- **Female Voice (`nathalie`)**:
  - Model: `https://huggingface.co/rhasspy/piper-voices/resolve/main/nl/nl_BE/nathalie/medium/nl_BE-nathalie-medium.onnx`
  - Config: `https://huggingface.co/rhasspy/piper-voices/resolve/main/nl/nl_BE/nathalie/medium/nl_BE-nathalie-medium.onnx.json`

---

## Device Permissions Setup

### Android (`android/app/src/main/AndroidManifest.xml`)
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

### iOS (`ios/Runner/Info.plist`)
```xml
<key>NSMicrophoneUsageDescription</key>
<string>EdgeTR requires microphone access for offline, on-device speech-to-text processing.</string>
```

---

## Latency Optimization: Sentence-Boundary Streaming

Rather than waiting for the entire LLM response to generate before initiating TTS:
1. `LocalVoicePipeline` intercepts streaming tokens from `mt_llmkit`.
2. Tokens accumulate into a temporary buffer until reaching sentence punctuation (`.`, `?`, `!`, `\n`).
3. The completed sentence is immediately handed off to `PiperTTS.speak(sentence)`.
4. The user hears the first sentence within ~400ms while remaining sentences continue generating in the background.

---

## Running & Testing

### 1. Build and Run
```bash
flutter pub get
flutter run
```

### 2. Testing Isolation & Verification Checklist
1. **STT Verification**: Feed Whisper a 16kHz mono WAV sample file and verify correct transcription.
2. **LLM Verification**: Pass prompt `"Wat is de hoofdstad van België?"` to `LlmService.generateCompleteResponse()`.
3. **Flemish Pronunciation Verification**: Verify synthesized audio uses Belgian Flemish phonetics (`g` and `w` sounds), distinct from northern Dutch.
4. **Airplane Mode Verification**:
   - Download models via the Model Manager.
   - Toggle phone to **Airplane Mode** (disable Wi-Fi and Cellular Data).
   - Record a voice turn and confirm the complete pipeline executes 100% offline.
5. **Mobile Device Targets**:
   - Mid-range Android: Samsung Galaxy A-series (4 GPU layers configured).
   - iOS: iPhone 12 or newer.
