import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Search, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface CatalogSearchBarProps {
  value: string;
  onChange: (nextValue: string) => void;
  totalMatchingFolders: number;
  totalMatchingTracks: number;
}

export const CatalogSearchBar: React.FC<CatalogSearchBarProps> = ({
  value,
  onChange,
  totalMatchingFolders,
  totalMatchingTracks,
}) => {
  const { t, languageOption } = useLanguage();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<{
    text: string;
    tone: 'warning' | 'info';
  } | null>(null);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // Ignore cleanup errors
      }
      recognitionRef.current = null;
    };
  }, []);

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop errors
    }
    setIsListening(false);
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      setVoiceMessage({
        text: t.micUnsupportedText,
        tone: 'warning',
      });
      inputRef.current?.focus();
      return;
    }

    setVoiceMessage(null);

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = languageOption.speechLang || 'fr-FR';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceMessage(null);
      };

      recognition.onresult = (event) => {
        let combinedTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result && result[0]?.transcript) {
            combinedTranscript += `${result[0].transcript} `;
          }
        }
        const cleaned = combinedTranscript.trim();
        if (cleaned) {
          onChange(cleaned);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        const errCode = (event?.error || '').toLowerCase();
        if (errCode === 'aborted') {
          return;
        }
        if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
          setVoiceMessage({
            text: t.micPermissionDeniedText,
            tone: 'warning',
          });
        } else if (errCode === 'no-speech') {
          setVoiceMessage({
            text: t.micNoSpeechText,
            tone: 'info',
          });
        } else if (errCode === 'language-not-supported' || errCode === 'audio-capture') {
          setVoiceMessage({
            text: t.micUnsupportedText,
            tone: 'warning',
          });
        } else {
          setVoiceMessage({
            text: t.micUnavailableText,
            tone: 'warning',
          });
        }
        inputRef.current?.focus();
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceMessage({
        text: t.micUnsupportedText,
        tone: 'warning',
      });
      inputRef.current?.focus();
    }
  };

  const hasQuery = value.trim().length > 0;

  return (
    <div className="mb-7 space-y-2.5">
      <div
        className={`relative flex items-center rounded-xl border bg-[#262A30] transition-all ${
          isListening
            ? 'border-[#10B981] ring-2 ring-[#10B981]/30 shadow-[0_0_24px_rgba(16,185,129,0.16)]'
            : 'border-[#363B44] focus-within:border-[#10B981]/70 focus-within:ring-2 focus-within:ring-[#10B981]/20'
        }`}
      >
        <Search
          className="ml-3.5 h-4 w-4 sm:h-5 sm:w-5 text-[#9CA3AF] shrink-0 pointer-events-none"
          aria-hidden="true"
        />

        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => {
            if (voiceMessage) setVoiceMessage(null);
            onChange(e.target.value);
          }}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchAriaLabel}
          className="w-full bg-transparent px-3 py-3 sm:py-3.5 text-sm sm:text-base text-[#F3F4F6] placeholder-[#9CA3AF] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />

        <div className="flex items-center gap-1.5 pr-2 shrink-0">
          {hasQuery && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setVoiceMessage(null);
                inputRef.current?.focus();
              }}
              aria-label={t.clearSearchAria}
              title={t.clearSearchAria}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#363B44]/70 hover:text-[#F3F4F6] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleMicClick}
            aria-label={isListening ? t.micStopAria : t.micStartAria}
            aria-pressed={isListening}
            title={isListening ? t.micStopAria : t.micStartAria}
            className={`relative inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              isListening
                ? 'bg-[#10B981] border-[#10B981] text-[#0B1410] shadow-[0_0_16px_rgba(16,185,129,0.5)]'
                : 'bg-[#1C1F24] border-[#363B44] hover:border-[#10B981]/60 hover:text-emerald-300 text-[#D1D5DB]'
            }`}
          >
            {isListening ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0B1410] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0B1410]" />
                </span>
                <MicOff className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t.micStopLabel}</span>
              </>
            ) : (
              <>
                <span aria-hidden="true" className="text-sm leading-none">
                  🎙️
                </span>
                <Mic className="h-3.5 w-3.5 shrink-0 hidden sm:inline" />
                <span className="hidden sm:inline">{t.micVoiceLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Voice Listening Pulsing Green Indicator */}
      {isListening && (
        <div
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-2.5 rounded-xl bg-[#10B981]/15 border border-[#10B981]/45 px-3.5 py-2 text-xs sm:text-sm font-bold text-emerald-300 animate-pulse"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-80" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]" />
          </span>
          <span>{t.micListeningText}</span>
        </div>
      )}

      {/* Polite fallback / error message when browser or device doesn't support SpeechRecognition */}
      {voiceMessage && !isListening && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-medium ${
            voiceMessage.tone === 'warning'
              ? 'bg-amber-500/10 border-amber-500/35 text-amber-200'
              : 'bg-[#262A30] border-[#363B44] text-[#D1D5DB]'
          }`}
        >
          <span>⚠️ {voiceMessage.text}</span>
          <button
            type="button"
            onClick={() => setVoiceMessage(null)}
            aria-label={t.modalCloseAria}
            className="text-current opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Live Filter Match Summary */}
      {hasQuery && !isListening && (
        <p className="text-xs text-[#9CA3AF] tabular-nums">
          {t.searchResultsPrefix}{' '}
          <span className="font-semibold text-[#F3F4F6]">« {value.trim()} »</span>:{' '}
          <span className="text-emerald-300 font-semibold">
            {totalMatchingFolders} {t.foldersFoundWord}
          </span>
          {totalMatchingTracks > 0 && (
            <>
              {' '}
              {t.andWord}{' '}
              <span className="text-emerald-300 font-semibold">
                {totalMatchingTracks} {t.tracksMatchWord}
              </span>
            </>
          )}
        </p>
      )}
    </div>
  );
};
