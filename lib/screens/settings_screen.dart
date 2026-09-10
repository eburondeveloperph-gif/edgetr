import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/pipeline_state.dart';
import '../services/local_voice_pipeline.dart';
import '../utils/constants.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late TextEditingController _promptController;
  double _temperature = AppConstants.defaultTemperature;
  double _gpuLayers = AppConstants.defaultGpuLayers.toDouble();

  @override
  void initState() {
    super.initState();
    _promptController =
        TextEditingController(text: AppConstants.defaultSystemPrompt);
  }

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pipeline = Provider.of<LocalVoicePipeline>(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      appBar: AppBar(
        title: const Text('Instellingen (Settings)'),
        backgroundColor: const Color(0xFF13151A),
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSectionHeader('Spraak & Stem (TTS)'),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFF13151A),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white10),
            ),
            child: Column(
              children: [
                RadioListTile<FlemishVoice>(
                  title: const Text('RDH (Mannelijk - nl_BE)',
                      style: TextStyle(color: Colors.white)),
                  subtitle: const Text(
                      'nl_BE-rdh-medium.onnx (Vlaamse uitspraak)',
                      style: TextStyle(color: Colors.white38, fontSize: 12)),
                  value: FlemishVoice.rdhMale,
                  groupValue: pipeline.selectedVoice,
                  onChanged: (val) {
                    if (val != null) pipeline.setFlemishVoice(val);
                  },
                ),
                const Divider(color: Colors.white12, height: 1),
                RadioListTile<FlemishVoice>(
                  title: const Text('Nathalie (Vrouwelijk - nl_BE)',
                      style: TextStyle(color: Colors.white)),
                  subtitle: const Text(
                      'nl_BE-nathalie-medium.onnx (Vlaamse uitspraak)',
                      style: TextStyle(color: Colors.white38, fontSize: 12)),
                  value: FlemishVoice.nathalieFemale,
                  groupValue: pipeline.selectedVoice,
                  onChanged: (val) {
                    if (val != null) pipeline.setFlemishVoice(val);
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          _buildSectionHeader('Qwen 2.5 0.5B LLM Configuratie'),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF13151A),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('GPU Offload Layers',
                        style: TextStyle(color: Colors.white, fontSize: 14)),
                    Text('${_gpuLayers.toInt()} lagen',
                        style: const TextStyle(
                            color: Color(0xFF448DFF), fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 4),
                const Text(
                  'Aanbevolen: 4 lagen voor mobiele telefoons (Galaxy A-serie / iPhone 12) om geheugenoverbelasting te voorkomen.',
                  style: TextStyle(color: Colors.white38, fontSize: 12),
                ),
                Slider(
                  value: _gpuLayers,
                  min: 0,
                  max: 16,
                  divisions: 16,
                  activeColor: const Color(0xFF2E96FF),
                  onChanged: (val) {
                    setState(() => _gpuLayers = val);
                  },
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Temperatuur',
                        style: TextStyle(color: Colors.white, fontSize: 14)),
                    Text(_temperature.toStringAsFixed(1),
                        style: const TextStyle(
                            color: Color(0xFF448DFF), fontWeight: FontWeight.bold)),
                  ],
                ),
                Slider(
                  value: _temperature,
                  min: 0.1,
                  max: 1.0,
                  divisions: 9,
                  activeColor: const Color(0xFF2E96FF),
                  onChanged: (val) {
                    setState(() => _temperature = val);
                  },
                ),
                const SizedBox(height: 12),
                const Text('Context Venster (nCtx)',
                    style: TextStyle(color: Colors.white, fontSize: 14)),
                const SizedBox(height: 4),
                const Text('2048 tokens (Vastgezet voor stabiel mobiel geheugen)',
                    style: TextStyle(color: Colors.white38, fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(height: 24),

          _buildSectionHeader('Systeemprompt (Vlaams)'),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF13151A),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white10),
            ),
            child: Column(
              children: [
                TextField(
                  controller: _promptController,
                  maxLines: 4,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Voer systeeminstructies in...',
                    hintStyle: const TextStyle(color: Colors.white38),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Colors.white24),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFF2E96FF)),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () {
                      _promptController.text = AppConstants.defaultSystemPrompt;
                    },
                    child: const Text('Herstel Standaard',
                        style: TextStyle(color: Color(0xFF448DFF))),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 4),
      child: Text(
        title,
        style: const TextStyle(
          color: Color(0xFF448DFF),
          fontWeight: FontWeight.bold,
          fontSize: 13,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
