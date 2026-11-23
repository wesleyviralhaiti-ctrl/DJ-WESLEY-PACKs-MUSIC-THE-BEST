import JSZip from 'jszip';
import { getResolvedTrackAudioUrl, MusicPack, TrackItem } from '../data/musicPacks';
import { getUploadedAudioExt, getUploadedMp3Buffer } from './audioAnalyzer';

const MIN_VALID_AUDIO_BYTES = 1001; // Strictly enforce byteLength > 1000

export const EMPTY_FOLDER_AUDIO_ERROR =
  '⚠️ Folder sa a poko gen fichye MP3 sou Supabase Storage — efase l nan Admin VIP epi re-upload mizik yo!';

function sanitizeFilename(input: string): string {
  return input
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferExtensionFromUrlOrName(urlOrName: string, fallback: string = 'mp3'): string {
  const clean = urlOrName.split('?')[0].toLowerCase();
  if (clean.endsWith('.wav')) return 'wav';
  if (clean.endsWith('.m4a')) return 'm4a';
  if (clean.endsWith('.aac')) return 'aac';
  if (clean.endsWith('.flac')) return 'flac';
  if (clean.endsWith('.ogg')) return 'ogg';
  if (clean.endsWith('.mp3')) return 'mp3';
  return fallback;
}

/**
 * Helper for clean ID3v2.3 tags (retained for backward compatibility).
 */
function encodeUtf16LeWithBom(text: string): Uint8Array {
  const bytes = new Uint8Array(2 + text.length * 2);
  bytes[0] = 0xff;
  bytes[1] = 0xfe;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bytes[2 + i * 2] = code & 0xff;
    bytes[2 + i * 2 + 1] = (code >> 8) & 0xff;
  }
  return bytes;
}

function createId3TextFrame(frameId: string, value: string): Uint8Array {
  const textBytes = encodeUtf16LeWithBom(value);
  const payloadSize = 1 + textBytes.length;
  const frame = new Uint8Array(10 + payloadSize);
  for (let i = 0; i < 4; i++) {
    frame[i] = frameId.charCodeAt(i);
  }
  const view = new DataView(frame.buffer);
  view.setUint32(4, payloadSize, false);
  view.setUint16(8, 0, false);
  frame[10] = 0x01;
  frame.set(textBytes, 11);
  return frame;
}

function writeSyncsafeInt(value: number, target: Uint8Array, offset: number): void {
  target[offset] = (value >> 21) & 0x7f;
  target[offset + 1] = (value >> 14) & 0x7f;
  target[offset + 2] = (value >> 7) & 0x7f;
  target[offset + 3] = value & 0x7f;
}

function stripExistingId3v2Tag(rawBytes: Uint8Array): Uint8Array {
  if (
    rawBytes.length >= 10 &&
    rawBytes[0] === 0x49 &&
    rawBytes[1] === 0x44 &&
    rawBytes[2] === 0x33
  ) {
    const size =
      ((rawBytes[6] & 0x7f) << 21) |
      ((rawBytes[7] & 0x7f) << 14) |
      ((rawBytes[8] & 0x7f) << 7) |
      (rawBytes[9] & 0x7f);
    const totalTagBytes = 10 + size;
    if (totalTagBytes < rawBytes.length) {
      return rawBytes.subarray(totalTagBytes);
    }
  }
  return rawBytes;
}

export function prependCleanId3v2Tags(
  rawAudioBuffer: ArrayBuffer,
  title: string,
  artist: string,
  album: string,
  trackNumber: number,
  totalTracks: number
): Uint8Array {
  const frames: Uint8Array[] = [
    createId3TextFrame('TIT2', title),
    createId3TextFrame('TPE1', artist),
    createId3TextFrame('TALB', album),
    createId3TextFrame('TRCK', `${trackNumber}/${totalTracks}`),
  ];
  let framesTotalLength = 0;
  for (const f of frames) framesTotalLength += f.length;

  const audioPayload = stripExistingId3v2Tag(new Uint8Array(rawAudioBuffer));
  const output = new Uint8Array(10 + framesTotalLength + audioPayload.length);
  output[0] = 0x49;
  output[1] = 0x44;
  output[2] = 0x33;
  output[3] = 0x03;
  output[4] = 0x00;
  output[5] = 0x00;
  writeSyncsafeInt(framesTotalLength, output, 6);

  let cursor = 10;
  for (const f of frames) {
    output.set(f, cursor);
    cursor += f.length;
  }
  output.set(audioPayload, cursor);
  return output;
}

/**
 * Safely attempts to obtain REAL binary audio bytes for one track.
 * Returns null if this track has no valid binary bytes (> 1000 bytes), never crashing the loop silently.
 */
async function tryFetchTrackBinaryBuffer(
  packId: string,
  track: TrackItem & { file?: File | Blob }
): Promise<{ buffer: ArrayBuffer; ext: string } | null> {
  const trackLabel = track.name || `${track.artist || 'Wesley VIP'} - ${track.title}`;

  // 1. Check if local track.file (File/Blob) exists
  if (track.file && typeof track.file.arrayBuffer === 'function') {
    try {
      const buf = await track.file.arrayBuffer();
      if (buf.byteLength >= MIN_VALID_AUDIO_BYTES) {
        const ext = inferExtensionFromUrlOrName(
          (track.file as File).name || track.name || '',
          'mp3'
        );
        return { buffer: buf, ext };
      }
    } catch (err) {
      console.warn(`Failed reading track.file for "${trackLabel}":`, err);
    }
  }

  // 2. Check in-memory uploaded ArrayBuffer cache (for Admin immediate upload session)
  const inMemory = getUploadedMp3Buffer(packId, track.number);
  if (inMemory && inMemory.byteLength >= MIN_VALID_AUDIO_BYTES) {
    const ext = getUploadedAudioExt(packId, track.number) || 'mp3';
    return { buffer: inMemory, ext };
  }

  // 3. Fetch from track.url / audioUrl / fileUrl / storagePath publicUrl inside try/catch
  const targetUrl = getResolvedTrackAudioUrl(track);
  if (
    targetUrl &&
    (targetUrl.startsWith('http://') ||
      targetUrl.startsWith('https://') ||
      targetUrl.startsWith('blob:'))
  ) {
    try {
      const res = await fetch(targetUrl);
      if (res.ok) {
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (!contentType.includes('text/html') && !contentType.includes('application/json')) {
          const buf = await res.arrayBuffer();
          if (buf.byteLength >= MIN_VALID_AUDIO_BYTES) {
            const ext = inferExtensionFromUrlOrName(
              targetUrl,
              inferExtensionFromUrlOrName(trackLabel, 'mp3')
            );
            return { buffer: buf, ext };
          }
        }
      }
    } catch (err) {
      console.warn(`Failed fetching track URL for "${trackLabel}":`, err);
    }
  }

  return null;
}

export async function getTrackBinaryBuffer(
  packId: string,
  track: TrackItem & { file?: File | Blob }
): Promise<{ buffer: ArrayBuffer; ext: string }> {
  const result = await tryFetchTrackBinaryBuffer(packId, track);
  if (!result) {
    throw new Error(EMPTY_FOLDER_AUDIO_ERROR);
  }
  return result;
}

export interface ZipProgressUpdate {
  percent: number;
  current: number;
  total: number;
  phase: 'fetching' | 'zipping';
  trackName: string;
}

export type ZipProgressCallback = (progress: ZipProgressUpdate) => void;

/**
 * Packages the entire folder into a real playable .ZIP blob.
 * - Never writes empty 0-byte placeholders or text strings.
 * - Throws EMPTY_FOLDER_AUDIO_ERROR if zero valid audio bytes were fetched.
 */
export async function buildCleanMp3Zip(
  pack: MusicPack,
  onProgress?: ZipProgressCallback
): Promise<Blob> {
  if (!pack.tracks || pack.tracks.length === 0) {
    throw new Error(EMPTY_FOLDER_AUDIO_ERROR);
  }

  const zip = new JSZip();
  const folder = zip.folder(pack.slug) ?? zip;
  const totalTracks = pack.tracks.length;
  const usedFilenames = new Set<string>();

  let validTracksAdded = 0;
  let totalAudioBytesAdded = 0;

  for (let index = 0; index < totalTracks; index++) {
    const track = pack.tracks[index];
    const numStr = String(track.number || index + 1).padStart(3, '0');
    const cleanArtist = sanitizeFilename(track.artist || 'Wesley VIP');
    const cleanTitle = sanitizeFilename(track.title || `Track ${track.number || index + 1}`);

    const startPercent = Math.round((index / totalTracks) * 80);
    onProgress?.({
      percent: startPercent,
      current: index + 1,
      total: totalTracks,
      phase: 'fetching',
      trackName: `${cleanArtist} - ${cleanTitle}`,
    });

    const fetched = await tryFetchTrackBinaryBuffer(pack.id, track);
    if (fetched && fetched.buffer.byteLength >= MIN_VALID_AUDIO_BYTES) {
      const baseName = track.name
        ? sanitizeFilename(track.name.replace(/\.[^/.]+$/, ''))
        : `${numStr} - ${cleanArtist} - ${cleanTitle}`;
      let cleanFileName = `${baseName || `${numStr} - Track`}.${fetched.ext}`;

      if (usedFilenames.has(cleanFileName.toLowerCase())) {
        cleanFileName = `${baseName}_${track.number || index + 1}.${fetched.ext}`;
      }
      usedFilenames.add(cleanFileName.toLowerCase());

      folder.file(cleanFileName, fetched.buffer, { binary: true });
      validTracksAdded += 1;
      totalAudioBytesAdded += fetched.buffer.byteLength;
    }

    const donePercent = Math.round(((index + 1) / totalTracks) * 80);
    onProgress?.({
      percent: donePercent,
      current: index + 1,
      total: totalTracks,
      phase: 'fetching',
      trackName: `${cleanArtist} - ${cleanTitle}`,
    });
  }

  if (validTracksAdded === 0 || totalAudioBytesAdded === 0) {
    throw new Error(EMPTY_FOLDER_AUDIO_ERROR);
  }

  return zip.generateAsync(
    {
      type: 'blob',
      compression: 'STORE',
    },
    (metadata) => {
      const zipPercent = 80 + Math.round((metadata.percent / 100) * 20);
      onProgress?.({
        percent: Math.min(99, zipPercent),
        current: totalTracks,
        total: totalTracks,
        phase: 'zipping',
        trackName: `Konpresyon .ZIP (${Math.round(metadata.percent)}%)...`,
      });
    }
  );
}

// Backward-compatibility alias
export const buildVirtualDjColorZip = async (
  pack: MusicPack,
  _keyCode?: string,
  _colorConfigOverride?: unknown,
  _cuesConfigOverride?: unknown,
  onProgress?: ZipProgressCallback
): Promise<Blob> => {
  return buildCleanMp3Zip(pack, onProgress);
};
