import 'dart:io';
import 'dart:typed_data';
import 'package:whisper_edge/whisper_edge.dart';
import '../utils/audio_converter.dart';

class WhisperService {
  WhisperTranscriber? _transcriber;
  bool _isLoaded = false;
  String? _loadedModelPath;

  bool get isLoaded => _isLoaded;
  String? get loadedModelPath => _loadedModelPath;

  /// Loads the whisper.cpp baseQ5_1 model from the given local storage path
  Future<void> loadModel(String modelPath) async {
    final file = File(modelPath);
    if (!await file.exists()) {
      throw Exception('Whisper model file does not exist at $modelPath');
    }

    _transcriber = await WhisperTranscriber.load(modelPath);
    _loadedModelPath = modelPath;
    _isLoaded = true;
  }

  /// Downloads the baseQ5_1 model directly using the built-in WhisperModelDownloader
  static Future<String> downloadBaseModel({
    required String targetDirectory,
    Function(double progress)? onProgress,
  }) async {
    final downloader = WhisperModelDownloader();
    final downloadedPath = await downloader.download(
      WhisperModel.baseQ5_1,
      targetDirectory,
      onProgress: (progress) {
        onProgress?.call(progress);
      },
    );
    return downloadedPath;
  }

  /// Transcribes 16kHz mono float32 audio samples in memory
  Future<String> transcribeSamples(Float32List samples) async {
    if (!_isLoaded || _transcriber == null) {
      throw Exception('Whisper model is not loaded');
    }
    if (samples.isEmpty) return '';

    final result = await _transcriber!.transcribe(samples);
    return result.trim();
  }

  /// Transcribes raw PCM16 byte buffer by converting to Float32List
  Future<String> transcribePcm16(Uint8List pcmBytes) async {
    final float32Samples = AudioConverter.pcm16ToFloat32(pcmBytes);
    return await transcribeSamples(float32Samples);
  }

  /// Transcribes a saved WAV file on disk
  Future<String> transcribeWavFile(String wavFilePath) async {
    if (!_isLoaded || _transcriber == null) {
      throw Exception('Whisper model is not loaded');
    }

    final result = await _transcriber!.transcribeWavFile(wavFilePath);
    return result.trim();
  }

  void dispose() {
    _transcriber = null;
    _isLoaded = false;
  }
}
