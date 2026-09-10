import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/pipeline_state.dart';
import '../services/local_voice_pipeline.dart';

class SidebarDrawer extends StatelessWidget {
  final VoidCallback onOpenModelManager;
  final VoidCallback onOpenStorageManager;
  final VoidCallback onOpenSettings;

  const SidebarDrawer({
    super.key,
    required this.onOpenModelManager,
    required this.onOpenStorageManager,
    required this.onOpenSettings,
  });

  @override
  Widget build(BuildContext context) {
    final pipeline = Provider.of<LocalVoicePipeline>(context);

    return Drawer(
      backgroundColor: const Color(0xFF13151A),
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(
              color: Color(0xFF1C1F26),
              border: Border(
                bottom: BorderSide(color: Color(0xFF2E96FF), width: 2),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const Row(
                  children: [
                    Icon(Icons.bolt, color: Color(0xFF448DFF), size: 28),
                    SizedBox(width: 8),
                    Text(
                      'EdgeTR',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'Offline Voice Assistant (Vlaams)',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.white.withOpacity(0.7),
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D9C53).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    'Airplane Mode Compatible',
                    style: TextStyle(fontSize: 10, color: Color(0xFF0D9C53)),
                  ),
                ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.chat_bubble_outline, color: Colors.white70),
            title: const Text('Gesprek (Chat)', style: TextStyle(color: Colors.white)),
            onTap: () => Navigator.pop(context),
          ),
          ListTile(
            leading: const Icon(Icons.sd_storage, color: Color(0xFF448DFF)),
            title: const Text('Opslagbeheer & Schijfruimte', style: TextStyle(color: Colors.white)),
            subtitle: Text(
              'Beheer lokale AI modellen & cache',
              style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.5)),
            ),
            onTap: () {
              Navigator.pop(context);
              onOpenStorageManager();
            },
          ),
          ListTile(
            leading: const Icon(Icons.download_for_offline, color: Colors.white70),
            title: const Text('Model Manager', style: TextStyle(color: Colors.white)),
            subtitle: Text(
              pipeline.modelManager.isOfflineReady()
                  ? 'Alle modellen gedownload'
                  : 'Modellen vereist',
              style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.5)),
            ),
            onTap: () {
              Navigator.pop(context);
              onOpenModelManager();
            },
          ),
          ListTile(
            leading: const Icon(Icons.settings, color: Colors.white70),
            title: const Text('Instellingen (Settings)', style: TextStyle(color: Colors.white)),
            onTap: () {
              Navigator.pop(context);
              onOpenSettings();
            },
          ),
          const Divider(color: Colors.white12),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text(
              'Vlaamse Stem (Piper nl_BE)',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Color(0xFF448DFF),
              ),
            ),
          ),
          RadioListTile<FlemishVoice>(
            activeColor: const Color(0xFF2E96FF),
            title: const Text('RDH (Mannelijk)', style: TextStyle(color: Colors.white, fontSize: 14)),
            subtitle: const Text('nl_BE-rdh-medium.onnx', style: TextStyle(color: Colors.white38, fontSize: 11)),
            value: FlemishVoice.rdhMale,
            groupValue: pipeline.selectedVoice,
            onChanged: (val) {
              if (val != null) pipeline.setFlemishVoice(val);
            },
          ),
          RadioListTile<FlemishVoice>(
            activeColor: const Color(0xFF2E96FF),
            title: const Text('Nathalie (Vrouwelijk)', style: TextStyle(color: Colors.white, fontSize: 14)),
            subtitle: const Text('nl_BE-nathalie-medium.onnx', style: TextStyle(color: Colors.white38, fontSize: 11)),
            value: FlemishVoice.nathalieFemale,
            groupValue: pipeline.selectedVoice,
            onChanged: (val) {
              if (val != null) pipeline.setFlemishVoice(val);
            },
          ),
        ],
      ),
    );
  }
}
