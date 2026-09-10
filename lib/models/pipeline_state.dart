/// State management definitions for the offline voice pipeline
enum PipelineStatus {
  uninitialized,
  downloadingModels,
  ready,
  listening,
  speechDetected,
  transcribing,
  generating,
  speaking,
  error,
}

enum FlemishVoice {
  rdhMale,
  nathalieFemale,
}

extension FlemishVoiceExtension on FlemishVoice {
  String get displayName {
    switch (this) {
      case FlemishVoice.rdhMale:
        return 'RDH (Male - nl_BE)';
      case FlemishVoice.nathalieFemale:
        return 'Nathalie (Female - nl_BE)';
    }
  }

  String get onnxFileName {
    switch (this) {
      case FlemishVoice.rdhMale:
        return 'nl_BE-rdh-medium.onnx';
      case FlemishVoice.nathalieFemale:
        return 'nl_BE-nathalie-medium.onnx';
    }
  }

  String get configFileName {
    switch (this) {
      case FlemishVoice.rdhMale:
        return 'nl_BE-rdh-medium.onnx.json';
      case FlemishVoice.nathalieFemale:
        return 'nl_BE-nathalie-medium.onnx.json';
    }
  }

  String get relativeHuggingFacePath {
    switch (this) {
      case FlemishVoice.rdhMale:
        return 'nl/nl_BE/rdh/medium/';
      case FlemishVoice.nathalieFemale:
        return 'nl/nl_BE/nathalie/medium/';
    }
  }
}
