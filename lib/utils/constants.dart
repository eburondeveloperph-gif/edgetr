class AppConstants {
  // Application Info
  static const String appTitle = 'EdgeTR Voice Assistant';
  static const String appVersion = '1.0.0';

  // Whisper Model Configuration
  static const String whisperModelName = 'Whisper baseQ5_1';
  static const int whisperApproxSizeBytes = 60 * 1024 * 1024; // ~60 MB
  static const String whisperFileName = 'ggml-base.en-q5_1.bin';

  // Qwen 2.5 0.5B LLM Configuration
  static const String qwenModelName = 'Qwen 2.5 0.5B Instruct (Q4_K_M)';
  static const String qwenFileName = 'qwen2.5-0.5b-instruct-q4_k_m.gguf';
  static const int qwenApproxSizeBytes = 398 * 1024 * 1024; // ~398 MB
  static const String qwenDownloadUrl =
      'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf';

  // Piper Flemish TTS Voices Configuration
  static const String piperBaseUrl =
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/';

  // Male Flemish voice (RDH)
  static const String piperRdhOnnxUrl =
      '${piperBaseUrl}nl/nl_BE/rdh/medium/nl_BE-rdh-medium.onnx';
  static const String piperRdhConfigUrl =
      '${piperBaseUrl}nl/nl_BE/rdh/medium/nl_BE-rdh-medium.onnx.json';
  static const int piperRdhSizeBytes = 65 * 1024 * 1024; // ~65 MB

  // Female Flemish voice (Nathalie)
  static const String piperNathalieOnnxUrl =
      '${piperBaseUrl}nl/nl_BE/nathalie/medium/nl_BE-nathalie-medium.onnx';
  static const String piperNathalieConfigUrl =
      '${piperBaseUrl}nl/nl_BE/nathalie/medium/nl_BE-nathalie-medium.onnx.json';
  static const int piperNathalieSizeBytes = 65 * 1024 * 1024; // ~65 MB

  // Audio Recording Specs
  static const int audioSampleRate = 16000;
  static const int audioChannels = 1;

  // LLM Inference Tuning
  static const double defaultTemperature = 0.7;
  static const int defaultContextWindow = 2048;
  static const int defaultGpuLayers = 4; // Safe for mid-range mobile GPUs (Galaxy A-series / iPhone 12)

  // Default Dutch/Flemish System Prompt
  static const String defaultSystemPrompt =
      'Je bent een behulpzame, vriendelijke spraakassistent die vloeiend Vlaams Nederlands spreekt. '
      'Geef beknopte, natuurlijke antwoorden die geschikt zijn voor spraakuitvoer.';
}
