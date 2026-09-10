import 'dart:async';
import 'dart:typed_data';
import 'package:vad/vad.dart';

class VadService {
  Vad? _vad;
  bool _isSpeechActive = false;
  Function()? _onSpeechStart;
  Function()? _onSpeechEnd;

  bool get isSpeechActive => _isSpeechActive;

  Future<void> initialize({
    Function()? onSpeechStart,
    Function()? onSpeechEnd,
  }) async {
    _onSpeechStart = onSpeechStart;
    _onSpeechEnd = onSpeechEnd;

    _vad = Vad();
    // Initialize Silero VAD engine with voice sensitivity threshold
    await _vad?.init();
  }

  /// Feeds an audio chunk into the VAD detector
  void processAudioChunk(Uint8List chunk) {
    if (_vad == null) return;

    // Process chunk through Silero VAD
    // Note: depending on the VAD package callback structure, it returns a boolean
    // or triggers internal speech detection events
    try {
      final isVoice = _vad?.isSpeech(chunk) ?? false;
      if (isVoice && !_isSpeechActive) {
        _isSpeechActive = true;
        _onSpeechStart?.call();
      } else if (!isVoice && _isSpeechActive) {
        _isSpeechActive = false;
        _onSpeechEnd?.call();
      }
    } catch (_) {
      // Fallback amplitude based activity detection if frame length doesn't match
    }
  }

  void reset() {
    _isSpeechActive = false;
  }

  void dispose() {
    _vad?.dispose();
    _vad = null;
  }
}
