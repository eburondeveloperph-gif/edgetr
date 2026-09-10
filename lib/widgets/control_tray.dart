import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/pipeline_state.dart';
import '../services/local_voice_pipeline.dart';
import 'mic_visualizer.dart';

class ControlTray extends StatelessWidget {
  const ControlTray({super.key});

  @override
  Widget build(BuildContext context) {
    final pipeline = Provider.of<LocalVoicePipeline>(context);
    final status = pipeline.status;
    final isListening = status == PipelineStatus.listening ||
        status == PipelineStatus.speechDetected;
    final isBusy = status == PipelineStatus.transcribing ||
        status == PipelineStatus.generating ||
        status == PipelineStatus.speaking;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF13151A),
        border: Border(
          top: BorderSide(color: Colors.white.withOpacity(0.08)),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Live audio waveform visualizer
            StreamBuilder<double>(
              stream: pipeline.micAmplitudeStream,
              initialData: 0.0,
              builder: (context, snapshot) {
                return MicVisualizer(
                  volume: snapshot.data ?? 0.0,
                  isActive: isListening,
                );
              },
            ),
            const SizedBox(height: 16),

            // Controls row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                // Voice Mute Button
                IconButton(
                  tooltip: pipeline.isMuted ? 'Unmute Audio' : 'Mute Audio',
                  onPressed: () => pipeline.toggleMute(),
                  icon: Icon(
                    pipeline.isMuted ? Icons.volume_off : Icons.volume_up,
                    color: pipeline.isMuted ? Colors.redAccent : Colors.white70,
                  ),
                ),

                // Main Push-to-Talk / Listening Toggle Button
                GestureDetector(
                  onTap: () {
                    if (isBusy) {
                      pipeline.interrupt();
                    } else {
                      pipeline.toggleListening();
                    }
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: isListening
                          ? const LinearGradient(
                              colors: [Color(0xFFE03C00), Color(0xFFFF5722)],
                            )
                          : isBusy
                              ? const LinearGradient(
                                  colors: [Color(0xFF2E96FF), Color(0xFF1F94FF)],
                                )
                              : const LinearGradient(
                                  colors: [Color(0xFF1F94FF), Color(0xFF0070E0)],
                                ),
                      boxShadow: [
                        BoxShadow(
                          color: (isListening
                                  ? const Color(0xFFFF5722)
                                  : const Color(0xFF1F94FF))
                              .withOpacity(0.4),
                          blurRadius: isListening ? 20 : 10,
                          spreadRadius: isListening ? 4 : 1,
                        ),
                      ],
                    ),
                    child: Center(
                      child: Icon(
                        isListening
                            ? Icons.mic
                            : isBusy
                                ? Icons.stop
                                : Icons.mic_none,
                        color: Colors.white,
                        size: 36,
                      ),
                    ),
                  ),
                ),

                // Clear Conversation History
                IconButton(
                  tooltip: 'Wis Gesprek (Clear)',
                  onPressed: pipeline.turns.isEmpty
                      ? null
                      : () => pipeline.clearHistory(),
                  icon: const Icon(
                    Icons.delete_outline,
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
