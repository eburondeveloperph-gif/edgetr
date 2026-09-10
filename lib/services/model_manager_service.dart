import 'dart:async';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import '../models/voice_model_info.dart';
import '../utils/constants.dart';
import 'whisper_service.dart';

class ModelManagerService {
  Directory? _modelsDir;
  final Map<String, VoiceModelInfo> _models = {};
  final StreamController<Map<String, VoiceModelInfo>> _modelsStateController =
      StreamController<Map<String, VoiceModelInfo>>.broadcast();

  Stream<Map<String, VoiceModelInfo>> get modelsStream =>
      _modelsStateController.stream;
  Map<String, VoiceModelInfo> get models => _models;

  Future<void> initialize() async {
    final appDocDir = await getApplicationDocumentsDirectory();
    _modelsDir = Directory('${appDocDir.path}/edgetr_models');
    if (!await _modelsDir!.exists()) {
      await _modelsDir!.create(recursive: true);
    }

    _registerModel(VoiceModelInfo(
      id: 'whisper_stt',
      name: AppConstants.whisperModelName,
      description: 'Speech-to-Text offline Whisper model (~60MB)',
      totalSizeBytes: AppConstants.whisperApproxSizeBytes,
      fileName: AppConstants.whisperFileName,
      downloadUrl: 'built-in-downloader',
    ));

    _registerModel(VoiceModelInfo(
      id: 'qwen_llm',
      name: AppConstants.qwenModelName,
      description: 'Qwen 2.5 0.5B Instruct Q4_K_M GGUF LLM (~398MB)',
      totalSizeBytes: AppConstants.qwenApproxSizeBytes,
      fileName: AppConstants.qwenFileName,
      downloadUrl: AppConstants.qwenDownloadUrl,
    ));

    _registerModel(VoiceModelInfo(
      id: 'piper_rdh_onnx',
      name: 'Piper Flemish RDH (Male)',
      description: 'Dutch Flemish Voice ONNX model (~65MB)',
      totalSizeBytes: AppConstants.piperRdhSizeBytes,
      fileName: 'nl_BE-rdh-medium.onnx',
      downloadUrl: AppConstants.piperRdhOnnxUrl,
    ));

    _registerModel(VoiceModelInfo(
      id: 'piper_rdh_config',
      name: 'Piper Flemish RDH Config',
      description: 'Flemish RDH Voice JSON configuration',
      totalSizeBytes: 8 * 1024,
      fileName: 'nl_BE-rdh-medium.onnx.json',
      downloadUrl: AppConstants.piperRdhConfigUrl,
    ));

    _registerModel(VoiceModelInfo(
      id: 'piper_nathalie_onnx',
      name: 'Piper Flemish Nathalie (Female)',
      description: 'Dutch Flemish Female Voice ONNX model (~65MB)',
      totalSizeBytes: AppConstants.piperNathalieSizeBytes,
      fileName: 'nl_BE-nathalie-medium.onnx',
      downloadUrl: AppConstants.piperNathalieOnnxUrl,
    ));

    _registerModel(VoiceModelInfo(
      id: 'piper_nathalie_config',
      name: 'Piper Flemish Nathalie Config',
      description: 'Flemish Nathalie Voice JSON configuration',
      totalSizeBytes: 8 * 1024,
      fileName: 'nl_BE-nathalie-medium.onnx.json',
      downloadUrl: AppConstants.piperNathalieConfigUrl,
    ));

    await refreshModelStatus();
  }

  void _registerModel(VoiceModelInfo model) {
    _models[model.id] = model;
  }

  /// Checks disk to verify which files are present and downloaded
  Future<void> refreshModelStatus() async {
    if (_modelsDir == null) return;

    for (final model in _models.values) {
      final filePath = '${_modelsDir!.path}/${model.fileName}';
      final file = File(filePath);
      if (await file.exists() && (await file.length()) > 1000) {
        model.isDownloaded = true;
        model.downloadProgress = 1.0;
        model.localPath = filePath;
      } else {
        model.isDownloaded = false;
        model.downloadProgress = 0.0;
        model.localPath = null;
      }
    }

    _modelsStateController.add(Map.from(_models));
  }

  /// Verifies if the essential pipeline (Whisper, Qwen, and at least 1 Flemish voice) is offline ready
  bool isOfflineReady() {
    final hasWhisper = _models['whisper_stt']?.isDownloaded ?? false;
    final hasLlm = _models['qwen_llm']?.isDownloaded ?? false;
    final hasRdh = (_models['piper_rdh_onnx']?.isDownloaded ?? false) &&
        (_models['piper_rdh_config']?.isDownloaded ?? false);
    final hasNathalie = (_models['piper_nathalie_onnx']?.isDownloaded ?? false) &&
        (_models['piper_nathalie_config']?.isDownloaded ?? false);

    return hasWhisper && hasLlm && (hasRdh || hasNathalie);
  }

  String? getModelPath(String modelId) {
    return _models[modelId]?.localPath;
  }

  /// Downloads a specific model file with live progress updates
  Future<String> downloadModel(String modelId) async {
    final model = _models[modelId];
    if (model == null) throw Exception('Unknown model ID: $modelId');
    if (_modelsDir == null) throw Exception('Models directory uninitialized');

    final targetPath = '${_modelsDir!.path}/${model.fileName}';

    if (modelId == 'whisper_stt') {
      // Use whisper_edge built-in downloader
      final path = await WhisperService.downloadBaseModel(
        targetDirectory: _modelsDir!.path,
        onProgress: (progress) {
          model.downloadProgress = progress;
          _modelsStateController.add(Map.from(_models));
        },
      );
      model.isDownloaded = true;
      model.downloadProgress = 1.0;
      model.localPath = path;
      _modelsStateController.add(Map.from(_models));
      return path;
    }

    // Standard HTTP streaming download for GGUF and ONNX files
    final request = http.Request('GET', Uri.parse(model.downloadUrl));
    final response = await http.Client().send(request);

    if (response.statusCode != 200) {
      throw Exception('Failed to download ${model.name}: HTTP ${response.statusCode}');
    }

    final totalBytes = response.contentLength ?? model.totalSizeBytes;
    int receivedBytes = 0;
    final file = File(targetPath);
    final sink = file.openWrite();

    await for (final chunk in response.stream) {
      sink.add(chunk);
      receivedBytes += chunk.length;
      if (totalBytes > 0) {
        model.downloadProgress = (receivedBytes / totalBytes).clamp(0.0, 1.0);
        _modelsStateController.add(Map.from(_models));
      }
    }

    await sink.flush();
    await sink.close();

    model.isDownloaded = true;
    model.downloadProgress = 1.0;
    model.localPath = targetPath;
    _modelsStateController.add(Map.from(_models));

    return targetPath;
  }

  /// Downloads all essential models in one go
  Future<void> downloadAllEssentials() async {
    await downloadModel('whisper_stt');
    await downloadModel('qwen_llm');
    await downloadModel('piper_rdh_onnx');
    await downloadModel('piper_rdh_config');
  }

  Future<void> deleteModel(String modelId) async {
    final model = _models[modelId];
    if (model == null) return;

    if (model.localPath != null) {
      final file = File(model.localPath!);
      if (await file.exists()) {
        await file.delete();
      }
    } else if (_modelsDir != null) {
      final file = File('${_modelsDir!.path}/${model.fileName}');
      if (await file.exists()) {
        await file.delete();
      }
    }

    model.isDownloaded = false;
    model.downloadProgress = 0.0;
    model.localPath = null;
    _modelsStateController.add(Map.from(_models));
  }

  /// Clears all downloaded models from the edge device disk to free up space
  Future<void> clearAllModels() async {
    for (final id in _models.keys) {
      await deleteModel(id);
    }
  }

  /// Calculates the total downloaded models size on disk in bytes
  Future<int> getTotalDownloadedSizeBytes() async {
    int total = 0;
    if (_modelsDir != null && await _modelsDir!.exists()) {
      try {
        final files = _modelsDir!.listSync();
        for (final entity in files) {
          if (entity is File) {
            total += await entity.length();
          }
        }
      } catch (e) {
        // Fallback to model metadata if listSync fails
        for (final m in _models.values) {
          if (m.isDownloaded) total += m.totalSizeBytes;
        }
      }
    }
    return total;
  }

  /// Calculates size of temporary audio recordings cache
  Future<int> getAudioCacheSizeBytes() async {
    try {
      final appDocDir = await getApplicationDocumentsDirectory();
      final cacheDir = Directory('${appDocDir.path}/audio_cache');
      if (await cacheDir.exists()) {
        int bytes = 0;
        for (final f in cacheDir.listSync(recursive: true)) {
          if (f is File) bytes += await f.length();
        }
        return bytes;
      }
    } catch (_) {}
    return 0;
  }

  /// Clears temporary recorded audio cache
  Future<void> clearAudioCache() async {
    try {
      final appDocDir = await getApplicationDocumentsDirectory();
      final cacheDir = Directory('${appDocDir.path}/audio_cache');
      if (await cacheDir.exists()) {
        await cacheDir.delete(recursive: true);
      }
    } catch (_) {}
  }

  /// Formats byte numbers to human readable string (e.g. 525 MB)
  static String formatBytes(int bytes) {
    if (bytes <= 0) return '0 B';
    const suffixes = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = 0;
    double count = bytes.toDouble();
    while (count >= 1024 && i < suffixes.length - 1) {
      count /= 1024;
      i++;
    }
    return '${count.toStringAsFixed(i >= 2 ? 1 : 0)} ${suffixes[i]}';
  }

  void dispose() {
    _modelsStateController.close();
  }
}
