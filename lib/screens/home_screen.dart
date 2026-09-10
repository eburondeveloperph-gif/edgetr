import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/pipeline_state.dart';
import '../services/local_voice_pipeline.dart';
import '../widgets/control_tray.dart';
import '../widgets/error_widget.dart';
import '../widgets/header_app_bar.dart';
import '../widgets/sidebar_drawer.dart';
import '../widgets/streaming_console.dart';
import 'model_manager_screen.dart';
import 'settings_screen.dart';
import 'storage_manager_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final pipeline = Provider.of<LocalVoicePipeline>(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      appBar: HeaderAppBar(
        onOpenSettings: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const SettingsScreen()),
          );
        },
        onOpenStorageManager: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const StorageManagerScreen()),
          );
        },
      ),
      drawer: SidebarDrawer(
        onOpenStorageManager: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const StorageManagerScreen()),
          );
        },
        onOpenModelManager: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const ModelManagerScreen()),
          );
        },
        onOpenSettings: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const SettingsScreen()),
          );
        },
      ),
      body: Column(
        children: [
          const PipelineErrorBanner(),
          if (pipeline.status == PipelineStatus.downloadingModels) ...[
            _buildDownloadPrompt(context),
          ],
          const Expanded(
            child: StreamingConsole(),
          ),
          const ControlTray(),
        ],
      ),
    );
  }

  Widget _buildDownloadPrompt(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E232A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF2E96FF).withOpacity(0.5)),
      ),
      child: Row(
        children: [
          const Icon(Icons.sd_storage, color: Color(0xFF448DFF), size: 28),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Lokale modellen beheren & downloaden',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    fontSize: 14,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Beheer schijfruimte en download Whisper (~60MB), Qwen (~398MB) en Piper Vlaams.',
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const StorageManagerScreen()),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1F94FF),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            ),
            child: const Text('Opslag'),
          ),
        ],
      ),
    );
  }
}
