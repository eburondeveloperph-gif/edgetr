import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/voice_model_info.dart';
import '../services/local_voice_pipeline.dart';
import '../services/model_manager_service.dart';

class StorageManagerScreen extends StatefulWidget {
  const StorageManagerScreen({super.key});

  @override
  State<StorageManagerScreen> createState() => _StorageManagerScreenState();
}

class _StorageManagerScreenState extends State<StorageManagerScreen> {
  final Set<String> _downloadingIds = {};
  int _totalDiskBytes = 0;
  int _audioCacheBytes = 0;
  bool _isLoadingMetrics = true;

  @override
  void initState() {
    super.initState();
    _refreshStorageMetrics();
  }

  Future<void> _refreshStorageMetrics() async {
    setState(() => _isLoadingMetrics = true);
    final pipeline = Provider.of<LocalVoicePipeline>(context, listen: false);
    final modelManager = pipeline.modelManager;
    await modelManager.refreshModelStatus();
    final total = await modelManager.getTotalDownloadedSizeBytes();
    final cache = await modelManager.getAudioCacheSizeBytes();
    if (mounted) {
      setState(() {
        _totalDiskBytes = total;
        _audioCacheBytes = cache;
        _isLoadingMetrics = false;
      });
    }
  }

  void _showClearAllConfirmation(
    BuildContext context,
    dynamic modelManager,
  ) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1A1C22),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 28),
            SizedBox(width: 10),
            Text(
              'Alle Modellen Wissen?',
              style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Dit zal alle offline AI-modellen (Whisper, Qwen, Piper) en tijdelijke audiocache van uw toestel verwijderen.',
              style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.redAccent.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.redAccent.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.storage, color: Colors.redAccent, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'U maakt direct ${ModelManagerService.formatBytes(_totalDiskBytes + _audioCacheBytes)} aan schijfruimte vrij.',
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Let op: U heeft internet nodig om de modellen opnieuw te downloaden.',
              style: TextStyle(color: Colors.amber, fontSize: 11),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuleren', style: TextStyle(color: Colors.white60)),
          ),
          ElevatedButton.icon(
            onPressed: () async {
              Navigator.pop(ctx);
              await modelManager.clearAllModels();
              await modelManager.clearAudioCache();
              await _refreshStorageMetrics();
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Alle modellen verwijderd. Schijfruimte vrijgemaakt.'),
                    backgroundColor: Color(0xFF0D9C53),
                  ),
                );
              }
            },
            icon: const Icon(Icons.delete_forever, size: 18),
            label: const Text('Wis Alles'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pipeline = Provider.of<LocalVoicePipeline>(context);
    final modelManager = pipeline.modelManager;
    final isOfflineReady = modelManager.isOfflineReady();

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      appBar: AppBar(
        title: const Text('Lokaal Opslagbeheer'),
        backgroundColor: const Color(0xFF13151A),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Vernieuw opslagstatus',
            onPressed: _refreshStorageMetrics,
          ),
        ],
      ),
      body: StreamBuilder<Map<String, VoiceModelInfo>>(
        stream: modelManager.modelsStream,
        initialData: modelManager.models,
        builder: (context, snapshot) {
          final models = snapshot.data?.values.toList() ?? [];
          final downloadedCount = models.where((m) => m.isDownloaded).length;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Device Storage Overview Card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: const Color(0xFF13151A),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isOfflineReady
                        ? const Color(0xFF0D9C53).withOpacity(0.3)
                        : const Color(0xFF2E96FF).withOpacity(0.3),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'GEBRUIKTE SCHIJFRUIMTE (TOESTEL)',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF448DFF),
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: isOfflineReady
                                ? const Color(0xFF0D9C53).withOpacity(0.2)
                                : Colors.amber.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isOfflineReady
                                  ? const Color(0xFF0D9C53)
                                  : Colors.amber,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                isOfflineReady
                                    ? Icons.airplanemode_active
                                    : Icons.cloud_download,
                                size: 12,
                                color: isOfflineReady
                                    ? const Color(0xFF0D9C53)
                                    : Colors.amber,
                              ),
                              const SizedBox(width: 5),
                              Text(
                                isOfflineReady ? 'Offline Klaar' : 'Niet Compleet',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isOfflineReady
                                      ? const Color(0xFF0D9C53)
                                      : Colors.amber,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _isLoadingMetrics
                          ? 'Berekenen...'
                          : ModelManagerService.formatBytes(_totalDiskBytes + _audioCacheBytes),
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$downloadedCount van ${models.length} AI-bestanden lokaal opgeslagen',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withOpacity(0.6),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Visual Storage Stack Bar
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: SizedBox(
                        height: 10,
                        child: Row(
                          children: [
                            // Whisper STT segment
                            Expanded(
                              flex: 60,
                              child: Container(color: const Color(0xFF1F94FF)),
                            ),
                            const SizedBox(width: 1),
                            // Qwen LLM segment
                            Expanded(
                              flex: 398,
                              child: Container(color: const Color(0xFF98BEFF)),
                            ),
                            const SizedBox(width: 1),
                            // Piper TTS segment
                            Expanded(
                              flex: 65,
                              child: Container(color: const Color(0xFF0D9C53)),
                            ),
                            const SizedBox(width: 1),
                            // Audio & config cache segment
                            Expanded(
                              flex: 10,
                              child: Container(color: const Color(0xFFFF9C7A)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Legend
                    Wrap(
                      spacing: 12,
                      runSpacing: 6,
                      children: [
                        _buildLegendItem('STT (~60MB)', const Color(0xFF1F94FF)),
                        _buildLegendItem('LLM (~398MB)', const Color(0xFF98BEFF)),
                        _buildLegendItem('Piper TTS (~65MB)', const Color(0xFF0D9C53)),
                        _buildLegendItem('Cache (~10MB)', const Color(0xFFFF9C7A)),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Quick Storage Action Buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: (_totalDiskBytes + _audioCacheBytes > 0)
                                ? () => _showClearAllConfirmation(context, modelManager)
                                : null,
                            icon: const Icon(Icons.delete_sweep, size: 16, color: Colors.redAccent),
                            label: const Text(
                              'Wis Alle Modellen',
                              style: TextStyle(fontSize: 12, color: Colors.redAccent),
                            ),
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(color: Colors.redAccent.withOpacity(0.4)),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              await modelManager.clearAudioCache();
                              await _refreshStorageMetrics();
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Audio cache gewist.')),
                                );
                              }
                            },
                            icon: const Icon(Icons.cleaning_services, size: 16, color: Colors.white70),
                            label: const Text(
                              'Wis Audio Cache',
                              style: TextStyle(fontSize: 12, color: Colors.white70),
                            ),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Colors.white24),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Download All Essentials banner if needed
              if (!isOfflineReady) ...[
                ElevatedButton.icon(
                  onPressed: () async {
                    try {
                      await modelManager.downloadAllEssentials();
                      await pipeline.loadResidentModels();
                      await _refreshStorageMetrics();
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Download fout: $e')),
                        );
                      }
                    }
                  },
                  icon: const Icon(Icons.cloud_download),
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
                const SizedBox(height: 20),
              ],

              const Text(
                'LOKALE AI BESTANDEN OP DIT TOESTEL',
                style: TextStyle(
                  color: Color(0xFF448DFF),
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 10),

              ...models.map((model) => _buildModelStorageCard(model, modelManager, pipeline)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.7)),
        ),
      ],
    );
  }

  Widget _buildModelStorageCard(
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
                    fontSize: 14,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: model.isDownloaded
                      ? const Color(0xFF0D9C53).withOpacity(0.2)
                      : Colors.white10,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  model.formattedSize,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
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
          const SizedBox(height: 6),
          Text(
            'Bestand: ${model.fileName}',
            style: TextStyle(
              fontSize: 11,
              fontFamily: 'monospace',
              color: Colors.white.withOpacity(0.4),
            ),
          ),
          const SizedBox(height: 10),

          if (isDownloading) ...[
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                LinearProgressIndicator(
                  value: model.downloadProgress > 0 ? model.downloadProgress : null,
                  backgroundColor: Colors.white10,
                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF2E96FF)),
                ),
                const SizedBox(height: 4),
                Text(
                  'Downloaden naar lokale opslag... ${(model.downloadProgress * 100).toStringAsFixed(0)}%',
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
                      await _refreshStorageMetrics();
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('${model.name} gewist (${model.formattedSize} vrijgemaakt)'),
                          ),
                        );
                      }
                    },
                    icon: const Icon(Icons.delete_outline, size: 16, color: Colors.redAccent),
                    label: const Text(
                      'Wis & Maak Ruimte Vrij',
                      style: TextStyle(color: Colors.redAccent, fontSize: 12),
                    ),
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
                        await _refreshStorageMetrics();
                      } catch (e) {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Download fout: $e')),
                          );
                        }
                      } finally {
                        setState(() => _downloadingIds.remove(model.id));
                      }
                    },
                    icon: const Icon(Icons.download, size: 16),
                    label: Text('Download (${model.formattedSize})', style: const TextStyle(fontSize: 12)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1F94FF),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
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
