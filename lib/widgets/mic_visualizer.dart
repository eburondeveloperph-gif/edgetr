import 'dart:math';
import 'package:flutter/material.dart';

class MicVisualizer extends StatelessWidget {
  final double volume; // 0.0 to 1.0
  final bool isActive;
  final int barCount;
  final Color activeColor;
  final Color idleColor;

  const MicVisualizer({
    super.key,
    required this.volume,
    this.isActive = false,
    this.barCount = 32,
    this.activeColor = const Color(0xFF448DFF),
    this.idleColor = const Color(0xFF3C4043),
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      child: CustomPaint(
        painter: _VisualizerPainter(
          volume: volume,
          isActive: isActive,
          barCount: barCount,
          activeColor: activeColor,
          idleColor: idleColor,
        ),
        size: Size.infinite,
      ),
    );
  }
}

class _VisualizerPainter extends CustomPainter {
  final double volume;
  final bool isActive;
  final int barCount;
  final Color activeColor;
  final Color idleColor;

  _VisualizerPainter({
    required this.volume,
    required this.isActive,
    required this.barCount,
    required this.activeColor,
    required this.idleColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final double totalSpacing = size.width / barCount;
    final double barWidth = max(2.0, totalSpacing - 2.0);
    final paint = Paint()
      ..style = PaintingStyle.fill
      ..strokeCap = StrokeCap.round;

    final half = barCount / 2;

    for (int i = 0; i < barCount; i++) {
      // Symmetrical center-weighted factor
      final barIndex = i < half ? i : barCount - 1 - i;
      final heightFactor = pow(barIndex / half, 1.6);
      final double baseHeight = 4.0;
      final double maxHeight = size.height * 0.9;
      final double dynamicHeight = isActive
          ? max(0.0, volume * maxHeight * (1.2 - heightFactor * 0.5))
          : 0.0;
      final double height = (baseHeight + dynamicHeight).clamp(4.0, maxHeight);

      final double x = i * totalSpacing + (totalSpacing - barWidth) / 2;
      final double y = (size.height - height) / 2;

      paint.color = isActive ? activeColor : idleColor;
      final rrect = RRect.fromRectAndRadius(
        Rect.fromLTWH(x, y, barWidth, height),
        const Radius.circular(3.0),
      );
      canvas.drawRRect(rrect, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _VisualizerPainter oldDelegate) {
    return oldDelegate.volume != volume || oldDelegate.isActive != isActive;
  }
}
