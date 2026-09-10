class VoiceModelInfo {
  final String id;
  final String name;
  final String description;
  final int totalSizeBytes;
  final String fileName;
  final String downloadUrl;
  bool isDownloaded;
  double downloadProgress; // 0.0 to 1.0
  String? localPath;

  VoiceModelInfo({
    required this.id,
    required this.name,
    required this.description,
    required this.totalSizeBytes,
    required this.fileName,
    required this.downloadUrl,
    this.isDownloaded = false,
    this.downloadProgress = 0.0,
    this.localPath,
  });

  String get formattedSize {
    final mb = totalSizeBytes / (1024 * 1024);
    if (mb >= 1024) {
      return '${(mb / 1024).toStringAsFixed(2)} GB';
    }
    return '${mb.toStringAsFixed(0)} MB';
  }
}
