import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import '../lib/utils/audio_converter.dart';
import '../lib/utils/constants.dart';
import '../lib/models/pipeline_state.dart';

void main() {
  group('AudioConverter Tests', () {
    test('pcm16ToFloat32 normalizes 16-bit integers to [-1.0, 1.0]', () {
      // 0, 32767 (max positive), -32768 (min negative)
      final pcmBytes = Uint8List.fromList([
        0x00, 0x00, // 0
        0xFF, 0x7F, // 32767
        0x00, 0x80, // -32768
      ]);

      final float32 = AudioConverter.pcm16ToFloat32(pcmBytes);

      expect(float32.length, equals(3));
      expect(float32[0], closeTo(0.0, 0.001));
      expect(float32[1], closeTo(1.0, 0.001));
      expect(float32[2], closeTo(-1.0, 0.001));
    });

    test('extractSentences extracts completed sentences and holds remaining tokens', () {
      const streamInput =
          'Hallo daar! Dit is een test van de Vlaamse spraakassistent. Hoe kan ik';

      final result = AudioConverter.extractSentences(streamInput);

      expect(result.completedSentences.length, equals(2));
      expect(result.completedSentences[0], equals('Hallo daar!'));
      expect(
        result.completedSentences[1],
        equals('Dit is een test van de Vlaamse spraakassistent.'),
      );
      expect(result.remaining, equals(' Hoe kan ik'));
    });
  });

  group('Model Specifications & Belgian Flemish Voices', () {
    test('Flemish voice configurations point to nl_BE models', () {
      expect(FlemishVoice.rdhMale.onnxFileName, equals('nl_BE-rdh-medium.onnx'));
      expect(FlemishVoice.rdhMale.configFileName, equals('nl_BE-rdh-medium.onnx.json'));
      expect(
        FlemishVoice.nathalieFemale.onnxFileName,
        equals('nl_BE-nathalie-medium.onnx'),
      );
      expect(
        FlemishVoice.nathalieFemale.configFileName,
        equals('nl_BE-nathalie-medium.onnx.json'),
      );
      expect(
        AppConstants.piperRdhOnnxUrl,
        contains('nl/nl_BE/rdh/medium/nl_BE-rdh-medium.onnx'),
      );
    });

    test('Qwen 2.5 0.5B default config respects mobile GPU memory constraints', () {
      expect(AppConstants.defaultGpuLayers, equals(4));
      expect(AppConstants.defaultContextWindow, equals(2048));
      expect(AppConstants.defaultTemperature, equals(0.7));
    });
  });
}
