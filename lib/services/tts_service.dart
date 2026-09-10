import 'dart:async';
import 'dart:collection';
import 'dart:io';
import 'package:flutter_piper_tts/flutter_piper_tts.dart';
import '../models/pipeline_state.dart';

class TtsService {
  PiperTTS? _piperTts;
  bool _isLoaded = false;
  FlemishVoice _currentVoice = FlemishVoice.rdhMale;
  bool _isSpeaking = false;
  bool _isMuted = false;

  final Queue<String> _sentenceQueue = Queue<String>();
  bool _isProcessingQueue = false;

  final StreamController<bool> _speakingStateController =
      StreamController<bool>.broadcast();

  bool get isLoaded => _isLoaded;
  bool get isSpeaking => _isSpeaking;
  bool get isMuted => _isMuted;
  FlemishVoice get currentVoice => _currentVoice;
  Stream<bool> get speakingStateStream => _speakingStateController.stream;

  /// Initializes Piper TTS with Dutch Flemish model and config (.onnx and .onnx.json)
  Future<void> loadVoice({
    required String modelPath,
    required String configPath,
    required FlemishVoice voice,
  }) async {
    final onnxFile = File(modelPath);
    final configFile = File(configPath);

    if (!await onnxFile.exists()) {
      throw Exception('Piper ONNX model not found: $modelPath');
    }
    if (!await configFile.exists()) {
      throw Exception('Piper ONNX JSON config not found: $configPath');
    }

    _piperTts?.dispose();

    _piperTts = await PiperTTS.create(
      modelPath: modelPath,
      configPath: configPath,
      strategy: PhonemizerStrategy.wordByWord,
    );

    _currentVoice = voice;
    _isLoaded = true;
  }

  /// Speaks a single complete sentence or phrase
  Future<void> speakSentence(String sentence) async {
    if (!_isLoaded || _piperTts == null || _isMuted) return;

    final text = sentence.trim();
    if (text.isEmpty) return;

    _sentenceQueue.add(text);
    _processQueue();
  }

  /// Internal queue worker to play sentences sequentially without overlaps
  Future<void> _processQueue() async {
    if (_isProcessingQueue || _sentenceQueue.isEmpty) return;
    _isProcessingQueue = true;

    while (_sentenceQueue.isNotEmpty) {
      if (_isMuted) {
        _sentenceQueue.clear();
        break;
      }

      final text = _sentenceQueue.removeFirst();
      _isSpeaking = true;
      _speakingStateController.add(true);

      try {
        await _piperTts?.speak(text);
      } catch (e) {
        // Continue to next sentence if one chunk fails
      }
    }

    _isSpeaking = false;
    _speakingStateController.add(false);
    _isProcessingQueue = false;
  }

  /// Stops current speech output and purges the speech queue immediately
  Future<void> stop() async {
    _sentenceQueue.clear();
    await _piperTts?.stop();
    _isSpeaking = false;
    _isProcessingQueue = false;
    _speakingStateController.add(false);
  }

  void setMuted(bool muted) {
    _isMuted = muted;
    if (_isMuted) {
      stop();
    }
  }

  void dispose() {
    stop();
    _speakingStateController.close();
    _piperTts?.dispose();
    _piperTts = null;
    _isLoaded = false;
  }
}
