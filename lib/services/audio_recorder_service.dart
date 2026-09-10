import 'dart:async';
import 'dart:typed_data';
import 'package:record/record.dart';
import '../utils/audio_converter.dart';
import '../utils/constants.dart';

class AudioRecorderService {
  final AudioRecorder _audioRecorder = AudioRecorder();
  StreamSubscription<Uint8List>? _recordStreamSub;
  StreamSubscription<Amplitude>? _amplitudeSub;

  final StreamController<double> _amplitudeController =
      StreamController<double>.broadcast();
  final List<Uint8List> _audioChunks = [];
  bool _isRecording = false;

  Stream<double> get amplitudeStream => _amplitudeController.stream;
  bool get isRecording => _isRecording;

  Future<bool> hasPermission() async {
    return await _audioRecorder.hasPermission();
  }

  /// Starts recording 16kHz mono WAV/PCM audio stream
  Future<void> startRecording({
    required Function(Uint8List chunk) onChunkReceived,
  }) async {
    if (_isRecording) return;

    final hasPerm = await hasPermission();
    if (!hasPerm) {
      throw Exception('Microphone permission denied');
    }

    _audioChunks.clear();

    const config = RecordConfig(
      encoder: AudioEncoder.wav,
      sampleRate: AppConstants.audioSampleRate,
      numChannels: AppConstants.audioChannels,
    );

    final stream = await _audioRecorder.startStream(config);
    _isRecording = true;

    _recordStreamSub = stream.listen((Uint8List chunk) {
      _audioChunks.add(chunk);
      onChunkReceived(chunk);

      final volume = AudioConverter.calculateRms(chunk);
      _amplitudeController.add(volume);
    });

    _amplitudeSub = _audioRecorder
        .onAmplitudeChanged(const Duration(milliseconds: 50))
        .listen((amp) {
      // Map dBFS (-60 to 0) to 0.0 -> 1.0
      final normalized = ((amp.current + 60) / 60).clamp(0.0, 1.0);
      _amplitudeController.add(normalized);
    });
  }

  /// Stops recording and returns all buffered raw audio bytes
  Future<Uint8List> stopRecording() async {
    if (!_isRecording) return Uint8List(0);

    await _recordStreamSub?.cancel();
    _recordStreamSub = null;
    await _amplitudeSub?.cancel();
    _amplitudeSub = null;
    await _audioRecorder.stop();

    _isRecording = false;
    _amplitudeController.add(0.0);

    // Flatten chunks into a single byte array
    final totalLength = _audioChunks.fold<int>(0, (sum, c) => sum + c.length);
    final result = Uint8List(totalLength);
    int offset = 0;
    for (final chunk in _audioChunks) {
      result.setRange(offset, offset + chunk.length, chunk);
      offset += chunk.length;
    }
    _audioChunks.clear();

    return result;
  }

  Future<void> dispose() async {
    await stopRecording();
    await _amplitudeController.close();
    await _audioRecorder.dispose();
  }
}
