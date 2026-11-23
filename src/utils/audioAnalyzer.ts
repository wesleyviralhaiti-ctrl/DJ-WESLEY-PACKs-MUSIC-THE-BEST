// Audio analyzer & metadata parser for Wesley Music Packs
// Extracts real audio duration and metadata from uploaded MP3 files

export interface AudioMetadataResult {
  durationSeconds: number;
  durationFormatted: string;
  artistGuess: string;
  titleGuess: string;
}

// In-memory store for uploaded audio raw ArrayBuffers keyed by `${packId}:${trackNumber}`
const uploadedMp3Registry = new Map<string, ArrayBuffer>();
const uploadedExtRegistry = new Map<string, string>();

export function storeUploadedMp3Buffer(
  packId: string,
  trackNumber: number,
  buffer: ArrayBuffer,
  fileExt: string = 'mp3'
): void {
  const key = `${packId}:${trackNumber}`;
  uploadedMp3Registry.set(key, buffer);
  uploadedExtRegistry.set(key, fileExt.toLowerCase());
}

export function getUploadedMp3Buffer(
  packId: string,
  trackNumber: number
): ArrayBuffer | undefined {
  return uploadedMp3Registry.get(`${packId}:${trackNumber}`);
}

export function getUploadedAudioExt(packId: string, trackNumber: number): string {
  return uploadedExtRegistry.get(`${packId}:${trackNumber}`) || 'mp3';
}

export function hasUploadedMp3Buffer(packId: string, trackNumber: number): boolean {
  return uploadedMp3Registry.has(`${packId}:${trackNumber}`);
}

export function countUploadedMp3sForPack(packId: string): number {
  let count = 0;
  const prefix = `${packId}:`;
  uploadedMp3Registry.forEach((_, key) => {
    if (key.startsWith(prefix)) count += 1;
  });
  return count;
}

export function clearUploadedMp3sForPack(packId: string): void {
  const prefix = `${packId}:`;
  Array.from(uploadedMp3Registry.keys()).forEach((key) => {
    if (key.startsWith(prefix)) {
      uploadedMp3Registry.delete(key);
      uploadedExtRegistry.delete(key);
    }
  });
}

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.wma', '.opus'];

export function isAudioFile(file: File): boolean {
  if (file.type && file.type.startsWith('audio/')) {
    return true;
  }
  const lower = file.name.toLowerCase();
  return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function getFileExtension(filename: string): string {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : 'mp3';
}

export function sortAudioFilesSequentially(files: File[]): File[] {
  return [...files].sort((a, b) => {
    const pathA = (a as File & { relativePathOverride?: string }).relativePathOverride || a.webkitRelativePath || a.name;
    const pathB = (b as File & { relativePathOverride?: string }).relativePathOverride || b.webkitRelativePath || b.name;
    return pathA.localeCompare(pathB, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export function extractFolderNameFromFileList(files: File[]): string | null {
  for (const file of files) {
    const rel =
      (file as File & { relativePathOverride?: string }).relativePathOverride ||
      file.webkitRelativePath ||
      '';
    if (rel.includes('/')) {
      const top = rel.split('/')[0]?.trim();
      if (top) return top;
    }
  }
  return null;
}

export interface FolderAudioGroup {
  folderName: string;
  files: File[];
}

/**
 * Groups selected or dropped audio files by subfolder name so selecting a parent
 * folder containing multiple subfolders (e.g., KONPA_DIFE, RABODAY_2026, REGGAE_VOL_1)
 * or dropping multiple folders at once creates separate sequential upload jobs.
 */
export function groupAudioFilesBySubfolder(rawFiles: File[]): FolderAudioGroup[] {
  const audioFiles = rawFiles.filter(isAudioFile);
  if (audioFiles.length === 0) return [];

  const withSegments = audioFiles.map((file) => {
    const rel =
      (file as File & { relativePathOverride?: string }).relativePathOverride ||
      file.webkitRelativePath ||
      file.name;
    const segments = rel.split('/').filter(Boolean);
    return { file, segments };
  });

  const topDirs = new Set(
    withSegments.filter((item) => item.segments.length >= 2).map((item) => item.segments[0])
  );
  const hasSubfoldersUnderSingleRoot =
    topDirs.size === 1 && withSegments.some((item) => item.segments.length >= 3);

  const grouped = new Map<string, File[]>();

  for (const { file, segments } of withSegments) {
    let folderName: string;
    if (topDirs.size > 1 && segments.length >= 2) {
      // Multiple root folders dropped at once -> group by root folder name
      folderName = segments[0];
    } else if (hasSubfoldersUnderSingleRoot) {
      // Parent folder selected via webkitdirectory -> group by subfolder name (segments[1])
      folderName = segments.length >= 3 ? segments[1] : segments[0];
    } else if (segments.length >= 2) {
      // Single folder selected
      folderName = segments[0];
    } else {
      folderName = `Folder_VIP_${audioFiles.length}_Mizik`;
    }

    const cleanName = folderName.trim() || 'Nouvo_Folder_VIP';
    const list = grouped.get(cleanName) || [];
    list.push(file);
    grouped.set(cleanName, list);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .map(([folderName, files]) => ({
      folderName,
      files: sortAudioFilesSequentially(files),
    }));
}

interface FileSystemEntryLike {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
  file?: (success: (f: File) => void, error?: (err: unknown) => void) => void;
  createReader?: () => {
    readEntries: (success: (entries: FileSystemEntryLike[]) => void, error?: (err: unknown) => void) => void;
  };
}

function readAllDirectoryEntries(dirEntry: FileSystemEntryLike): Promise<FileSystemEntryLike[]> {
  return new Promise((resolve) => {
    if (!dirEntry.createReader) {
      resolve([]);
      return;
    }
    const reader = dirEntry.createReader();
    const collected: FileSystemEntryLike[] = [];

    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (!batch || batch.length === 0) {
            resolve(collected);
          } else {
            collected.push(...batch);
            readBatch();
          }
        },
        () => resolve(collected)
      );
    };

    readBatch();
  });
}

async function traverseEntry(entry: FileSystemEntryLike, parentPath: string = ''): Promise<File[]> {
  if (entry.isFile && entry.file) {
    return new Promise((resolve) => {
      entry.file!(
        (file) => {
          if (isAudioFile(file)) {
            const annotated = file as File & { relativePathOverride?: string };
            annotated.relativePathOverride = parentPath ? `${parentPath}/${file.name}` : file.name;
            resolve([annotated]);
          } else {
            resolve([]);
          }
        },
        () => resolve([])
      );
    });
  }

  if (entry.isDirectory) {
    const dirPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
    const children = await readAllDirectoryEntries(entry);
    const nested = await Promise.all(children.map((child) => traverseEntry(child, dirPath)));
    return nested.flat();
  }

  return [];
}

/**
 * Extracts all dropped audio files, recursively traversing dropped folders via webkitGetAsEntry()
 * and returning the detected folder name when a directory is dropped.
 */
export async function extractDroppedAudioFiles(
  dataTransfer: DataTransfer
): Promise<{ files: File[]; folderName: string | null }> {
  const items = dataTransfer.items ? Array.from(dataTransfer.items) : [];
  const entries: FileSystemEntryLike[] = [];

  for (const item of items) {
    const withEntry = item as DataTransferItem & {
      webkitGetAsEntry?: () => FileSystemEntryLike | null;
    };
    if (typeof withEntry.webkitGetAsEntry === 'function') {
      const entry = withEntry.webkitGetAsEntry();
      if (entry) entries.push(entry);
    }
  }

  if (entries.length > 0) {
    const dirEntry = entries.find((e) => e.isDirectory);
    const allFilesNested = await Promise.all(entries.map((entry) => traverseEntry(entry)));
    const audioFiles = sortAudioFilesSequentially(allFilesNested.flat());
    const folderName = dirEntry ? dirEntry.name : extractFolderNameFromFileList(audioFiles);
    return { files: audioFiles, folderName };
  }

  const fallbackFiles = sortAudioFilesSequentially(
    Array.from(dataTransfer.files || []).filter(isAudioFile)
  );
  return {
    files: fallbackFiles,
    folderName: extractFolderNameFromFileList(fallbackFiles),
  };
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function parseFilenameMetadata(filename: string): {
  artistGuess: string;
  titleGuess: string;
} {
  const base = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/^\d{1,3}\s*[-_.]\s*/, '')
    .trim();
  const dashIdx = base.indexOf(' - ');
  if (dashIdx > 0) {
    return {
      artistGuess: base.slice(0, dashIdx).trim(),
      titleGuess: base.slice(dashIdx + 3).trim(),
    };
  }
  return {
    artistGuess: 'Wesley VIP Folder',
    titleGuess: base || 'Track',
  };
}

export async function analyzeAudioFile(
  file: File
): Promise<{
  metadata: AudioMetadataResult;
  rawBuffer: ArrayBuffer;
  fileExt: string;
  decodedOk: boolean;
}> {
  const rawBuffer = await file.arrayBuffer();
  const fileExt = getFileExtension(file.name);
  const { artistGuess, titleGuess } = parseFilenameMetadata(file.name);

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtx) {
    return {
      metadata: {
        durationSeconds: 210,
        durationFormatted: '3:30',
        artistGuess,
        titleGuess,
      },
      rawBuffer,
      fileExt,
      decodedOk: false,
    };
  }

  const ctx = new AudioCtx();
  try {
    const bufferCopy = rawBuffer.slice(0);
    const audioBuffer = await ctx.decodeAudioData(bufferCopy);
    const durationSeconds = Math.max(1, Math.round(audioBuffer.duration));
    return {
      metadata: {
        durationSeconds,
        durationFormatted: formatDuration(durationSeconds),
        artistGuess,
        titleGuess,
      },
      rawBuffer,
      fileExt,
      decodedOk: true,
    };
  } catch {
    return {
      metadata: {
        durationSeconds: 210,
        durationFormatted: '3:30',
        artistGuess,
        titleGuess,
      },
      rawBuffer,
      fileExt,
      decodedOk: false,
    };
  } finally {
    void ctx.close();
  }
}
