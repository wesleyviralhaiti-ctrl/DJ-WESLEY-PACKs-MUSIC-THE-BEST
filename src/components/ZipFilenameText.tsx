import React from 'react';

interface ZipFilenameTextProps {
  filename: string;
  className?: string;
}

/**
 * Formats .ZIP folder names (including underscores & emojis like RABODAY_VIBE_🎶💥.zip)
 * so they wrap cleanly across 1–2 balanced lines on mobile screens without ever
 * splitting ".zip" onto a broken/orphaned line.
 */
export const ZipFilenameText: React.FC<ZipFilenameTextProps> = ({
  filename,
  className = '',
}) => {
  const match = filename.match(/^(.*?)(\.zip)$/i);
  if (!match) {
    return <span className={`[text-wrap:balance] ${className}`}>{filename}</span>;
  }

  const base = match[1];
  const ext = match[2];

  // Insert safe <wbr /> break points after underscores while keeping the final
  // segment + ".zip" locked together via whitespace-nowrap.
  const segments = base.split('_').filter((seg, idx, arr) => {
    // Keep non-empty segments, or preserve single trailing if base had trailing underscore
    return seg.length > 0 || idx < arr.length - 1;
  });

  if (segments.length > 1) {
    const leading = segments.slice(0, -1);
    const tail = segments[segments.length - 1];

    // If the final underscore segment itself is long (>14 chars), allow breaking before
    // the trailing 4 characters + .zip while keeping those trailing chars glued to .zip.
    const tailChars = Array.from(tail);
    const keepTogetherTail =
      tailChars.length > 14 ? tailChars.slice(-4).join('') : tail;
    const overflowHead =
      tailChars.length > 14 ? tailChars.slice(0, -4).join('') : '';

    return (
      <span className={`[text-wrap:balance] ${className}`}>
        {leading.map((seg, idx) => (
          <React.Fragment key={`${idx}-${seg}`}>
            {seg}_<wbr />
          </React.Fragment>
        ))}
        {overflowHead}
        <span className="whitespace-nowrap">
          {keepTogetherTail}
          {ext}
        </span>
      </span>
    );
  }

  // Single token without underscores: keep trailing 4 glyphs glued to .zip
  const chars = Array.from(base);
  const glueCount = Math.min(4, chars.length);
  const prefix = chars.slice(0, chars.length - glueCount).join('');
  const suffix = chars.slice(chars.length - glueCount).join('');

  return (
    <span className={`[text-wrap:balance] [overflow-wrap:anywhere] ${className}`}>
      {prefix}
      <span className="whitespace-nowrap">
        {suffix}
        {ext}
      </span>
    </span>
  );
};
