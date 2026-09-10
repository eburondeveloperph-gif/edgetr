import 'dart:async';
import 'dart:io';
import 'package:mt_llmkit/llmcpp.dart';
import '../utils/constants.dart';

class LlmService {
  LocalModel? _model;
  bool _isLoaded = false;
  String _systemPrompt = AppConstants.defaultSystemPrompt;
  double _temperature = AppConstants.defaultTemperature;
  int _contextWindow = AppConstants.defaultContextWindow;
  int _gpuLayers = AppConstants.defaultGpuLayers;

  bool get isLoaded => _isLoaded;
  String get systemPrompt => _systemPrompt;
  double get temperature => _temperature;
  int get contextWindow => _contextWindow;
  int get gpuLayers => _gpuLayers;

  /// Initializes and loads the Qwen 2.5 0.5B GGUF model via llama.cpp
  Future<void> loadModel(
    String ggufModelPath, {
    double? temperature,
    int? contextWindow,
    int? gpuLayers,
    String? systemPrompt,
  }) async {
    final file = File(ggufModelPath);
    if (!await file.exists()) {
      throw Exception('GGUF model file not found at $ggufModelPath');
    }

    _temperature = temperature ?? _temperature;
    _contextWindow = contextWindow ?? _contextWindow;
    _gpuLayers = gpuLayers ?? _gpuLayers;
    if (systemPrompt != null) _systemPrompt = systemPrompt;

    // Configured with safe nGpuLayers (4-8) to prevent OOM on mobile GPUs
    final config = LlmConfig(
      temp: _temperature,
      nCtx: _contextWindow,
      nGpuLayers: _gpuLayers,
    );

    _model = LocalModel(
      modelPath: ggufModelPath,
      config: config,
    );

    await _model!.init();
    _isLoaded = true;
  }

  /// Formats user query with the Qwen 2.5 ChatML format
  String formatChatMlPrompt(String userText,
      {List<Map<String, String>> history = const []}) {
    final buffer = StringBuffer();

    // System turn
    buffer.writeln('<|im_start|>system');
    buffer.writeln(_systemPrompt);
    buffer.writeln('<|im_end|>');

    // Past conversation turns
    for (final turn in history) {
      final role = turn['role'] ?? 'user';
      final content = turn['content'] ?? '';
      buffer.writeln('<|im_start|>$role');
      buffer.writeln(content);
      buffer.writeln('<|im_end|>');
    }

    // Current user turn
    buffer.writeln('<|im_start|>user');
    buffer.writeln(userText);
    buffer.writeln('<|im_end|>');
    buffer.writeln('<|im_start|>assistant');

    return buffer.toString();
  }

  /// Streams token strings in real-time as they are emitted from llama.cpp
  Stream<String> generateStreamingResponse(String userPrompt,
      {List<Map<String, String>> history = const []}) {
    if (!_isLoaded || _model == null) {
      throw Exception('LLM model is not loaded');
    }

    final formattedPrompt = formatChatMlPrompt(userPrompt, history: history);
    return _model!.sendPrompt(formattedPrompt);
  }

  /// Blocking one-shot generation
  Future<String> generateCompleteResponse(String userPrompt,
      {List<Map<String, String>> history = const []}) async {
    if (!_isLoaded || _model == null) {
      throw Exception('LLM model is not loaded');
    }

    final formattedPrompt = formatChatMlPrompt(userPrompt, history: history);
    return await _model!.sendPromptComplete(formattedPrompt);
  }

  void updateSystemPrompt(String newPrompt) {
    _systemPrompt = newPrompt;
  }

  void updateParameters({double? temperature, int? gpuLayers}) {
    if (temperature != null) _temperature = temperature;
    if (gpuLayers != null) _gpuLayers = gpuLayers;
  }

  void dispose() {
    _model?.dispose();
    _model = null;
    _isLoaded = false;
  }
}
