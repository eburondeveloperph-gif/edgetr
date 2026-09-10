import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/voice_model_info.dart';
import '../services/local_voice_pipeline.dart';

class ModelManagerScreen extends StatefulWidget {
  const ModelManagerScreen({super.key});

  @override
  State<ModelManagerScreen> createState() => _ModelManagerScreenState();
}

class _ModelManagerScreenState extends State<ModelManagerScreen> {
  final Set<String> _downloadingIds = {};

  @override
  Widget build(BuildContext context) {
    final pipeline = Provider.of<LocalVoicePipeline>(context);
    final modelManager = pipeline.modelManager;
    final isOfflineReady = modelManager.isOfflineReady();

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      appBar: AppBar(
        title: const Text('Model Manager (Offline Opslag)'),
        backgroundColor: const Color(0xFF13151A),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Vernieuw status',
            onPressed: () => modelManager.refreshModelStatus(),
          ),
        ],
      ),
      body: StreamBuilder<Map<String, VoiceModelInfo>>(
        stream: modelManager.modelsStream,
        initialData: modelManager.models,
        builder: (context, snapshot) {
          final models = snapshot.data?.values.toList() ?? [];

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Offline readiness banner
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isOfflineReady
                      ? const Color(0xFF025022).withOpacity(0.5)
                      : const Color(0xFF404547).withOpacity(0.3),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isOfflineReady
                        ? const Color(0xFF0D9C53)
                        : Colors.white24,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      isOfflineReady
                          ? Icons.airplanemode_active
                          : Icons.cloud_download,
                      color: isOfflineReady
                          ? const Color(0xFF0D9C53)
                          : Colors.amber,
                      size: 32,
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isOfflineReady
                                ? 'Vliegtuigmodus Gereed'
                                : 'Download Modellen voor Offline Gebruik',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            isOfflineReady
                                ? 'Alle vereiste AI-modellen staan lokaal opgeslagen. Geen wifi of mobiele data nodig.'
                                : 'Download Whisper, Qwen en minimaal één Vlaamse Piper-stem om offline te werken.',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.white.withOpacity(0.7),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              if (!isOfflineReady) ...[
                ElevatedButton.icon(
                  onPressed: () async {
                    try {
                      await modelManager.downloadAllEssentials();
                      await pipeline.loadResidentModels();
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Download fout: $e')),
                      );
                    }
                  },
                  icon: const Icon(Icons.download),
                  label: const Text('Download Alle Vereiste Modellen (~470 MB)'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1F94FF),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              const Text(
                'LOKALE AI COMPONENTEN',
                style: TextStyle(
                  color: Color(0xFF448DFF),
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),

              ...models.map((model) => _buildModelCard(model, modelManager, pipeline)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildModelCard(
    VoiceModelInfo model,
    dynamic modelManager,
    LocalVoicePipeline pipeline,
  ) {
    final isDownloading = _downloadingIds.contains(model.id) ||
        (model.downloadProgress > 0 && model.downloadProgress < 1.0);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF13151A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: model.isDownloaded
              ? const Color(0xFF0D9C53).withOpacity(0.3)
              : Colors.white10,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  model.name,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    fontSize: 15,
                  ),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: model.isDownloaded
                      ? const Color(0xFF0D9C53).withOpacity(0.2)
                      : Colors.white10,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  model.isDownloaded ? 'Gedownload' : model.formattedSize,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: model.isDownloaded
                        ? const Color(0xFF0D9C53)
                        : Colors.white70,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            model.description,
            style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12),
          ),
          const SizedBox(height: 10),

          if (isDownloading) ...[
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                LinearProgressIndicator(
                  value: model.downloadProgress > 0 ? model.downloadProgress : null,
                  backgroundColor: Colors.white10,
                  valueColor:
                      const AlwaysStoppedAnimation<Color>(Color(0xFF2E96FF)),
                ),
                const SizedBox(height: 4),
                Text(
                  'Downloaden... ${(model.downloadProgress * 100).toStringAsFixed(0)}%',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF448DFF)),
                ),
              ],
            ),
          ] else ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (model.isDownloaded) ...[
                  TextButton.icon(
                    onPressed: () async {
                      await modelManager.deleteModel(model.id);
                    },
                    icon: const Icon(Icons.delete_outline,
                        size: 16, color: Colors.redAccent),
                    label: const Text('Verwijderen',
                        style: TextStyle(color: Colors.redAccent, fontSize: 12)),
                  ),
                ] else ...[
                  ElevatedButton.icon(
                    onPressed: () async {
                      setState(() => _downloadingIds.add(model.id));
                      try {
                        await modelManager.downloadModel(model.id);
                        if (modelManager.isOfflineReady()) {
                          await pipeline.loadResidentModels();
                        }
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Download fout: $e')),
                        );
                      } finally {
                        setState(() => _downloadingIds.remove(model.id));
                      }
                    },
                    icon: const Icon(Icons.download, size: 16),
                    label: const Text('Download', style: TextStyle(fontSize: 12)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1F94FF),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 8),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ],
      ),
    );
  }
}
