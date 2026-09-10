import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/conversation_turn.dart';
import '../models/pipeline_state.dart';
import '../services/local_voice_pipeline.dart';

class StreamingConsole extends StatefulWidget {
  const StreamingConsole({super.key});

  @override
  State<StreamingConsole> createState() => _StreamingConsoleState();
}

class _StreamingConsoleState extends State<StreamingConsole> {
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final pipeline = Provider.of<LocalVoicePipeline>(context);
    final turns = pipeline.turns;

    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());

    if (turns.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: const Color(0xFF1F94FF).withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.offline_bolt_outlined,
                  color: Color(0xFF448DFF),
                  size: 40,
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'EdgeTR Offline Spraakassistent',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '100% lokaal op uw toestel. Geen internet of API-keys vereist na het downloaden van de modellen.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.white.withOpacity(0.6),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E232A),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.record_voice_over,
                        size: 16, color: Color(0xFF448DFF)),
                    const SizedBox(width: 8),
                    Text(
                      'Stem: ${pipeline.selectedVoice.displayName}',
                      style: const TextStyle(
                        fontSize: 13,
                        color: Colors.white70,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      itemCount: turns.length,
      itemBuilder: (context, index) {
        final turn = turns[index];
        return _buildTurnBubble(turn, pipeline);
      },
    );
  }

  Widget _buildTurnBubble(ConversationTurn turn, LocalVoicePipeline pipeline) {
    final isUser = turn.role == 'user';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment:
            isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              margin: const EdgeInsets.only(right: 8, top: 2),
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                color: Color(0xFF1F94FF),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.smart_toy, size: 16, color: Colors.white),
            ),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isUser ? const Color(0xFF2E96FF) : const Color(0xFF1C1F26),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isUser ? 16 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 16),
                ),
                border: Border.all(
                  color: isUser
                      ? Colors.transparent
                      : Colors.white.withOpacity(0.08),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isUser ? 'Jij (You)' : 'EdgeTR (Vlaams)',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isUser ? Colors.white70 : const Color(0xFF448DFF),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    turn.text.isEmpty && !turn.isFinal ? '...' : turn.text,
                    style: const TextStyle(
                      fontSize: 15,
                      color: Colors.white,
                      height: 1.4,
                    ),
                  ),
                  if (!turn.isFinal) ...[
                    const SizedBox(height: 6),
                    const SizedBox(
                      width: 12,
                      height: 12,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white70),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          if (isUser) ...[
            Container(
              margin: const EdgeInsets.only(left: 8, top: 2),
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.person, size: 16, color: Colors.white70),
            ),
          ],
        ],
      ),
    );
  }
}
