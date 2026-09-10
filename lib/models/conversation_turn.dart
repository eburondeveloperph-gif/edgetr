class ConversationTurn {
  final String id;
  final String role; // 'user' | 'assistant'
  String text;
  final DateTime timestamp;
  bool isFinal;
  final int? latencyMs;

  ConversationTurn({
    required this.id,
    required this.role,
    required this.text,
    required this.timestamp,
    this.isFinal = true,
    this.latencyMs,
  });

  ConversationTurn copyWith({
    String? id,
    String? role,
    String? text,
    DateTime? timestamp,
    bool? isFinal,
    int? latencyMs,
  }) {
    return ConversationTurn(
      id: id ?? this.id,
      role: role ?? this.role,
      text: text ?? this.text,
      timestamp: timestamp ?? this.timestamp,
      isFinal: isFinal ?? this.isFinal,
      latencyMs: latencyMs ?? this.latencyMs,
    );
  }
}
