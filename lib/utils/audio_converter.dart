import 'dart:typed_data';

class AudioConverter {
  /// Converts PCM16 Little-Endian byte buffer to normalized Float32List (-1.0 to 1.0)
  /// as required by Whisper.cpp offline models.
  static Float32List pcm16ToFloat32(Uint8List bytes) {
    final int sampleCount = bytes.length ~/ 2;
    final Float32List float32 = Float32List(sampleCount);
    final ByteData byteData = ByteData.sublistView(bytes);

    for (int i = 0; i < sampleCount; i++) {
      final int sample = byteData.getInt16(i * 2, Endian.little);
      float32[i] = sample / 32768.0;
    }

    return float32;
  }

  /// Calculates root-mean-square (RMS) volume from PCM bytes for audio visualizers
  static double calculateRms(Uint8List bytes) {
    if (bytes.isEmpty) return 0.0;
    final int sampleCount = bytes.length ~/ 2;
    if (sampleCount == 0) return 0.0;

    final ByteData byteData = ByteData.sublistView(bytes);
    double sumOfSquares = 0.0;

    for (int i = 0; i < sampleCount; i++) {
      final int sample = byteData.getInt16(i * 2, Endian.little);
      final double normalized = sample / 32768.0;
      sumOfSquares += normalized * normalized;
    }

    final double rms = (sumOfSquares / sampleCount);
    return rms > 0.0 ? (rms * 10).clamp(0.0, 1.0) : 0.0;
  }

  /// Splits an accumulated text buffer into completed sentences and remaining buffer.
  /// Uses Dutch / English sentence boundary characters (. ! ? \n)
  static ({List<String> completedSentences, String remaining}) extractSentences(
      String accumulatedText) {
    final List<String> sentences = [];
    final RegExp sentenceRegex = RegExp(r'([^.!?\n]+[.!?\n]+)');
    final matches = sentenceRegex.allMatches(accumulatedText);

    int lastMatchEnd = 0;
    for (final match in matches) {
      final sentence = match.group(0)?.trim();
      if (sentence != null && sentence.isNotEmpty) {
        sentences.add(sentence);
      }
      lastMatchEnd = match.end;
    }

    final remaining = accumulatedText.substring(lastMatchEnd);
    return (completedSentences: sentences, remaining: remaining);
  }
}
