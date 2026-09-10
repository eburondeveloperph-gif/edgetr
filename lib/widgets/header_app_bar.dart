import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/pipeline_state.dart';
import '../services/local_voice_pipeline.dart';

class HeaderAppBar extends StatelessWidget implements PreferredSizeWidget {
  final VoidCallback onOpenSettings;
  final VoidCallback? onOpenStorageManager;

  const HeaderAppBar({
    super.key,
    required this.onOpenSettings,
    this.onOpenStorageManager,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    final pipeline = Provider.of<LocalVoicePipeline>(context);
    final status = pipeline.status;

    return AppBar(
      backgroundColor: const Color(0xFF13151A),
      elevation: 0,
      titleSpacing: 0,
      title: Row(
        children: [
          const Icon(Icons.bolt, color: Color(0xFF448DFF), size: 22),
          const SizedBox(width: 8),
          const Text(
            'EdgeTR',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 18,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(width: 12),
          // Status badge
          _buildStatusChip(status, pipeline.statusMessage),
        ],
      ),
      actions: [
        if (onOpenStorageManager != null) ...[
          IconButton(
            icon: const Icon(Icons.sd_storage, color: Color(0xFF448DFF)),
            tooltip: 'Lokaal Opslagbeheer',
            onPressed: onOpenStorageManager,
          ),
        ],
        IconButton(
          icon: const Icon(Icons.tune, color: Colors.white70),
          tooltip: 'Instellingen (Settings)',
          onPressed: onOpenSettings,
        ),
      ],
    );
  }

  Widget _buildStatusChip(PipelineStatus status, String message) {
    Color chipColor;
    IconData chipIcon;
    String label;

    switch (status) {
      case PipelineStatus.ready:
        chipColor = const Color(0xFF0D9C53);
        chipIcon = Icons.airplanemode_active;
        label = 'Offline Klaar';
        break;
      case PipelineStatus.listening:
      case PipelineStatus.speechDetected:
        chipColor = const Color(0xFFFF4600);
        chipIcon = Icons.mic;
        label = 'Luisteren';
        break;
      case PipelineStatus.transcribing:
        chipColor = const Color(0xFF1F94FF);
        chipIcon = Icons.graphic_eq;
        label = 'Whisper STT';
        break;
      case PipelineStatus.generating:
        chipColor = const Color(0xFF98BEFF);
        chipIcon = Icons.psychology;
        label = 'Qwen LLM';
        break;
      case PipelineStatus.speaking:
        chipColor = const Color(0xFF448DFF);
        chipIcon = Icons.volume_up;
        label = 'Piper Vlaams';
        break;
      case PipelineStatus.downloadingModels:
        chipColor = Colors.amber;
        chipIcon = Icons.downloading;
        label = 'Download Modellen';
        break;
      case PipelineStatus.error:
        chipColor = Colors.red;
        chipIcon = Icons.error_outline;
        label = 'Fout';
        break;
      case PipelineStatus.uninitialized:
        chipColor = Colors.grey;
        chipIcon = Icons.hourglass_top;
        label = 'Laden';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: chipColor.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: chipColor.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(chipIcon, size: 12, color: chipColor),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: chipColor,
            ),
          ),
        ],
      ),
    );
  }
}
