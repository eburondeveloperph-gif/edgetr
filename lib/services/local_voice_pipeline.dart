import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/conversation_turn.dart';
import '../models/pipeline_state.dart';
import '../utils/audio_converter.dart';
import 'audio_recorder_service.dart';
import 'llm_service.dart';
import 'model_manager_service.dart';
import 'tts_service.dart';
import 'vad_service.dart';
import 'whisper_service.dart';

class LocalVoicePipeline extends ChangeNotifier {
  final AudioRecorderService _recorder = AudioRecorderService();
  final VadService _vad = VadService();
  final WhisperService _whisper = WhisperService();
  final LlmService _llm = LlmService();
  final TtsService _tts = TtsService();
  final ModelManagerService _modelManager = ModelManagerService();

  PipelineStatus _status = PipelineStatus.uninitialized;
  String _statusMessage = 'Initializing local edge models...';
  FlemishVoice _selectedVoice = FlemishVoice.rdhMale;
  bool _isMuted = false;

  final List<ConversationTurn> _turns = [];
  final StreamController<String> _userTranscriptController =
      StreamController<String>.broadcast();
  final StreamController<String> _aiTokenController =
      StreamController<String>.broadcast();

  StreamSubscription<String>? _llmStreamSubscription;
  DateTime? _turnStartTime;

  // Getters
  PipelineStatus get status => _status;
  String get statusMessage => _statusMessage;
  FlemishVoice get selectedVoice => _selectedVoice;
  bool get isMuted => _isMuted;
  List<ConversationTurn> get turns => List.unmodifiable(_turns);
  ModelManagerService get modelManager => _modelManager;

  Stream<String> get userTranscriptStream => _userTranscriptController.stream;
  Stream<String> get aiTokenStream => _aiTokenController.stream;
  Stream<double> get micAmplitudeStream => _recorder.amplitudeStream;
  Stream<bool> get speakingStateStream => _tts.speakingStateStream;

  LocalVoicePipeline() {
    _initPipeline();
  }

  /// Initializes models, downloads if missing, and keeps them resident in memory
  Future<void> _initPipeline() async {
    _updateStatus(PipelineStatus.uninitialized, 'Checking offline models...');
    await _modelManager.initialize();

    if (!_modelManager.isOfflineReady()) {
      _updateStatus(
        PipelineStatus.downloadingModels,
        'Offline models required. Please download in Model Manager.',
      );
      return;
    }

    await loadResidentModels();
  }

  /// Loads Whisper STT, Qwen 2.5 LLM, Piper Flemish TTS into memory for zero-latency turns
  Future<void> loadResidentModels() async {
    try {
      _updateStatus(PipelineStatus.uninitialized, 'Loading Whisper STT...');
      final whisperPath = _modelManager.getModelPath('whisper_stt');
      if (whisperPath != null) {
        await _whisper.loadModel(whisperPath);
      }

      _updateStatus(PipelineStatus.uninitialized, 'Loading Qwen 2.5 0.5B LLM...');
      final qwenPath = _modelManager.getModelPath('qwen_llm');
      if (qwenPath != null) {
        await _llm.loadModel(qwenPath);
      }

      _updateStatus(PipelineStatus.uninitialized, 'Loading Flemish Piper TTS...');
      await _loadSelectedVoice();

      _updateStatus(PipelineStatus.uninitialized, 'Initializing VAD...');
      await _vad.initialize(
        onSpeechStart: () {
          if (_status == PipelineStatus.listening) {
            _updateStatus(PipelineStatus.speechDetected, 'Listening to you...');
          }
        },
        onSpeechEnd: () {
          // Trigger automatic end-of-turn when user stops speaking
          if (_status == PipelineStatus.speechDetected ||
              _status == PipelineStatus.listening) {
            _onUserFinishedSpeaking();
          }
        },
      );

      _updateStatus(PipelineStatus.ready, 'Klaar (Ready - Tap mic to speak)');
    } catch (e) {
      _updateStatus(
        PipelineStatus.error,
        'Initialization error: ${e.toString()}',
      );
    }
  }

  Future<void> _loadSelectedVoice() async {
    final onnxId = _selectedVoice == FlemishVoice.rdhMale
        ? 'piper_rdh_onnx'
        : 'piper_nathalie_onnx';
    final configId = _selectedVoice == FlemishVoice.rdhMale
        ? 'piper_rdh_config'
        : 'piper_nathalie_config';

    final onnxPath = _modelManager.getModelPath(onnxId);
    final configPath = _modelManager.getModelPath(configId);

    if (onnxPath != null && configPath != null) {
      await _tts.loadVoice(
        modelPath: onnxPath,
        configPath: configPath,
        voice: _selectedVoice,
      );
    }
  }

  /// Changes the Flemish voice at runtime (rdh male vs nathalie female)
  Future<void> setFlemishVoice(FlemishVoice voice) async {
    if (_selectedVoice == voice) return;
    _selectedVoice = voice;
    notifyListeners();
    await _loadSelectedVoice();
  }

  /// Toggles microphone capture
  Future<void> toggleListening() async {
    if (_status == PipelineStatus.listening ||
        _status == PipelineStatus.speechDetected) {
      await _onUserFinishedSpeaking();
    } else if (_status == PipelineStatus.ready) {
      await startListening();
    }
  }

  /// Begins mic capture and feeds incoming frames to Silero VAD
  Future<void> startListening() async {
    // If speaking, interrupt TTS immediately
    await _tts.stop();
    _vad.reset();

    _turnStartTime = DateTime.now();
    _updateStatus(PipelineStatus.listening, 'Luisteren... (Speak in Dutch/Flemish)');

    try {
      await _recorder.startRecording(
        onChunkReceived: (chunk) {
          _vad.processAudioChunk(chunk);
        },
      );
    } catch (e) {
      _updateStatus(PipelineStatus.error, 'Mic error: ${e.toString()}');
    }
  }

  /// Called automatically by VAD or manually when user finishes talking
  Future<void> _onUserFinishedSpeaking() async {
    if (!_recorder.isRecording) return;

    _updateStatus(PipelineStatus.transcribing, 'Transcribing locally with Whisper...');

    final audioBytes = await _recorder.stopRecording();
    if (audioBytes.isEmpty) {
      _updateStatus(PipelineStatus.ready, 'Klaar');
      return;
    }

    try {
      // 1. Transcribe with Whisper offline
      final transcript = await _whisper.transcribePcm16(audioBytes);
      if (transcript.isEmpty) {
        _updateStatus(PipelineStatus.ready, 'Geen spraak gedetecteerd (No speech detected)');
        return;
      }

      // Add user turn to history & stream
      final userTurn = ConversationTurn(
        id: 'turn-${DateTime.now().millisecondsSinceEpoch}',
        role: 'user',
        text: transcript,
        timestamp: DateTime.now(),
      );
      _turns.add(userTurn);
      _userTranscriptController.add(transcript);
      notifyListeners();

      // 2. Feed transcript to LLM with streaming and sentence-level TTS synthesis
      await _processLlmAndTts(transcript);
    } catch (e) {
      _updateStatus(PipelineStatus.error, 'Pipeline processing error: $e');
    }
  }

  /// Feeds prompt to Qwen 2.5 0.5B, streams tokens, and synthesizes speech as sentences complete
  Future<void> _processLlmAndTts(String userPrompt) async {
    _updateStatus(PipelineStatus.generating, 'Qwen 2.5 denkt na... (Generating)');

    final assistantTurn = ConversationTurn(
      id: 'ai-${DateTime.now().millisecondsSinceEpoch}',
      role: 'assistant',
      text: '',
      timestamp: DateTime.now(),
      isFinal: false,
    );
    _turns.add(assistantTurn);
    notifyListeners();

    final history = _turns
        .where((t) => t != assistantTurn)
        .take(6)
        .map((t) => {'role': t.role, 'content': t.text})
        .toList();

    String accumulatedBuffer = '';
    String fullResponseText = '';

    final tokenStream = _llm.generateStreamingResponse(userPrompt, history: history);
    final completer = Completer<void>();

    _llmStreamSubscription = tokenStream.listen(
      (token) {
        fullResponseText += token;
        accumulatedBuffer += token;

        assistantTurn.text = fullResponseText;
        _aiTokenController.add(token);
        notifyListeners();

        // Optimized sentence-by-sentence boundary check (. ! ? \n)
        final extracted = AudioConverter.extractSentences(accumulatedBuffer);
        if (extracted.completedSentences.isNotEmpty) {
          for (final sentence in extracted.completedSentences) {
            _tts.speakSentence(sentence);
          }
          accumulatedBuffer = extracted.remaining;
          _updateStatus(PipelineStatus.speaking, 'Spreken in Vlaams (Piper nl_BE)...');
        }
      },
      onDone: () async {
        // Synthesize any trailing tokens left in buffer
        if (accumulatedBuffer.trim().isNotEmpty) {
          _tts.speakSentence(accumulatedBuffer.trim());
        }

        assistantTurn.isFinal = true;
        notifyListeners();

        if (_turnStartTime != null) {
          final elapsed = DateTime.now().difference(_turnStartTime!).inMilliseconds;
          debugPrint('End-to-end turn latency: ${elapsed}ms');
        }

        _updateStatus(PipelineStatus.ready, 'Klaar (Ready)');
        completer.complete();
      },
      onError: (error) {
        _updateStatus(PipelineStatus.error, 'LLM error: $error');
        completer.completeError(error);
      },
      cancelOnError: true,
    );

    return completer.future;
  }

  /// Cancels active speech or generation
  Future<void> interrupt() async {
    await _llmStreamSubscription?.cancel();
    _llmStreamSubscription = null;
    await _tts.stop();
    if (_recorder.isRecording) {
      await _recorder.stopRecording();
    }
    _updateStatus(PipelineStatus.ready, 'Klaar (Interrupted)');
  }

  void toggleMute() {
    _isMuted = !_isMuted;
    _tts.setMuted(_isMuted);
    notifyListeners();
  }

  void clearHistory() {
    _turns.clear();
    notifyListeners();
  }

  void _updateStatus(PipelineStatus status, String message) {
    _status = status;
    _statusMessage = message;
    notifyListeners();
  }

  @override
  void dispose() {
    _llmStreamSubscription?.cancel();
    _userTranscriptController.close();
    _aiTokenController.close();
    _recorder.dispose();
    _vad.dispose();
    _whisper.dispose();
    _llm.dispose();
    _tts.dispose();
    _modelManager.dispose();
    super.dispose();
  }
}
