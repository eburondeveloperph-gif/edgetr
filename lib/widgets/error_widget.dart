import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/pipeline_state.dart';
import '../services/local_voice_pipeline.dart';

class PipelineErrorBanner extends StatelessWidget {
  const PipelineErrorBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final pipeline = Provider.of<LocalVoicePipeline>(context);

    if (pipeline.status != PipelineStatus.error) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: const Color(0xFFBD3000),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: Colors.white, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              pipeline.statusMessage,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          TextButton(
            onPressed: () => pipeline.loadResidentModels(),
            style: TextButton.styleFrom(
              foregroundColor: Colors.white,
              backgroundColor: Colors.white.withOpacity(0.2),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            ),
            child: const Text('Opnieuw', style: TextStyle(fontSize: 12)),
          ),
        ],
      ),
    );
  }
}
