/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GgufMetadata {
  fileName: string;
  fileSize: number;
  magic: string;
  version: number;
  tensorCount: number;
  metadataCount: number;
  architecture: string;
  modelName: string;
  contextLength?: number;
  quantization: string;
  isValid: boolean;
  error?: string;
}

/**
 * Detects quantization tag from filename or file type enum
 */
export function detectQuantization(filename: string): string {
  const match = filename.match(/(Q\d_[A-Z0-9_]+|IQ\d_[A-Z0-9_]+|FP16|F16|BF16|Q8_0|Q4_0|Q4_1|Q5_0|Q5_1)/i);
  return match ? match[1].toUpperCase() : 'Quantized (GGUF)';
}

/**
 * Reads the first slice of a GGUF file and parses its header and metadata KV pairs.
 */
export async function parseGgufHeader(file: File | Blob): Promise<GgufMetadata> {
  const defaultMeta: GgufMetadata = {
    fileName: (file as File).name || 'local-model.gguf',
    fileSize: file.size,
    magic: '',
    version: 0,
    tensorCount: 0,
    metadataCount: 0,
    architecture: 'transformer',
    modelName: (file as File).name || 'Local GGUF',
    quantization: detectQuantization((file as File).name || ''),
    isValid: false,
  };

  try {
    // Read the first 128KB for metadata
    const sliceSize = Math.min(file.size, 128 * 1024);
    const buffer = await file.slice(0, sliceSize).arrayBuffer();
    const dataView = new DataView(buffer);

    // Magic: 0x46554747 ('GGUF' in ASCII)
    const m0 = dataView.getUint8(0);
    const m1 = dataView.getUint8(1);
    const m2 = dataView.getUint8(2);
    const m3 = dataView.getUint8(3);
    const magic = String.fromCharCode(m0, m1, m2, m3);

    if (magic !== 'GGUF') {
      return {
        ...defaultMeta,
        error: `Invalid file header: expected GGUF, got "${magic}". Please select a valid .gguf model.`,
      };
    }

    const version = dataView.getUint32(4, true);
    if (version < 1 || version > 4) {
      return {
        ...defaultMeta,
        magic,
        version,
        error: `Unsupported GGUF version ${version}. Supported versions: 2 or 3.`,
      };
    }

    // Number of tensors (uint64 in little-endian)
    const tensorCountLow = dataView.getUint32(8, true);
    // Number of metadata KV pairs (uint64)
    const kvCountLow = dataView.getUint32(16, true);

    defaultMeta.magic = magic;
    defaultMeta.version = version;
    defaultMeta.tensorCount = tensorCountLow;
    defaultMeta.metadataCount = kvCountLow;
    defaultMeta.isValid = true;

    // Parse KV pairs up to available buffer
    let offset = 24;
    const decoder = new TextDecoder('utf-8');

    for (let i = 0; i < kvCountLow && offset < buffer.byteLength - 8; i++) {
      // Key length (uint64)
      const keyLen = dataView.getUint32(offset, true);
      offset += 8;

      if (offset + keyLen > buffer.byteLength) break;
      const keyBytes = new Uint8Array(buffer, offset, keyLen);
      const key = decoder.decode(keyBytes);
      offset += keyLen;

      // Value type (uint32)
      if (offset + 4 > buffer.byteLength) break;
      const valType = dataView.getUint32(offset, true);
      offset += 4;

      // Type 8: String (uint64 len + utf8)
      if (valType === 8) {
        if (offset + 8 > buffer.byteLength) break;
        const strLen = dataView.getUint32(offset, true);
        offset += 8;
        if (offset + strLen > buffer.byteLength) break;
        const strBytes = new Uint8Array(buffer, offset, strLen);
        const strVal = decoder.decode(strBytes);
        offset += strLen;

        if (key === 'general.architecture') {
          defaultMeta.architecture = strVal;
        } else if (key === 'general.name') {
          defaultMeta.modelName = strVal;
        }
      } else if (valType === 4 || valType === 5) {
        // UINT32 / INT32
        if (offset + 4 > buffer.byteLength) break;
        const numVal = dataView.getUint32(offset, true);
        offset += 4;
        if (key.endsWith('.context_length')) {
          defaultMeta.contextLength = numVal;
        }
      } else if (valType === 10 || valType === 11) {
        // UINT64 / INT64
        if (offset + 8 > buffer.byteLength) break;
        const numVal = dataView.getUint32(offset, true);
        offset += 8;
        if (key.endsWith('.context_length')) {
          defaultMeta.contextLength = numVal;
        }
      } else if (valType === 0 || valType === 1 || valType === 7) {
        // 1-byte values (uint8, int8, bool)
        offset += 1;
      } else if (valType === 2 || valType === 3) {
        // 2-byte values
        offset += 2;
      } else if (valType === 6) {
        // float32
        offset += 4;
      } else if (valType === 12) {
        // float64
        offset += 8;
      } else if (valType === 9) {
        // Array - skip conservatively
        break;
      } else {
        break;
      }
    }

    return defaultMeta;
  } catch (err: any) {
    return {
      ...defaultMeta,
      error: `Failed to parse GGUF headers: ${err.message || 'Corrupted file'}`,
    };
  }
}
