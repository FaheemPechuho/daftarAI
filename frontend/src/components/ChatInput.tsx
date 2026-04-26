import { useRef, useEffect, useState, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { Mic, Send, Square } from 'lucide-react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

type RecordingState = 'idle' | 'recording' | 'transcribing';

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = 'Message Daftar…',
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [micError, setMicError] = useState<string | null>(null);

  // Auto-resize: shrink to content, cap at 200px, hide native scrollbar
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSend(value);
    }
  };

  const transcribeAudio = useCallback(async (blob: Blob) => {
    setRecordingState('transcribing');
    try {
      const formData = new FormData();
      const ext = blob.type.includes('ogg') ? 'audio.ogg' : 'audio.webm';
      formData.append('file', blob, ext);

      const res = await fetch('/transcribe', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Transcription failed' }));
        throw new Error(err.detail || 'Transcription failed');
      }
      const data: { text: string } = await res.json();
      if (data.text) onChange(data.text.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      setMicError(msg);
      setTimeout(() => setMicError(null), 4000);
    } finally {
      setRecordingState('idle');
    }
  }, [onChange]);

  const startRecording = useCallback(async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        transcribeAudio(new Blob(chunksRef.current, { type: recorder.mimeType }));
      };
      recorder.start();
      setRecordingState('recording');
    } catch {
      setMicError('Microphone access denied. Please allow mic in browser settings.');
      setTimeout(() => setMicError(null), 4000);
    }
  }, [transcribeAudio]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }, []);

  const handleMicClick = () => {
    if (recordingState === 'idle') startRecording();
    else if (recordingState === 'recording') stopRecording();
  };

  const canSend = value.trim() && !disabled && recordingState === 'idle';
  const isRecording = recordingState === 'recording';
  const isTranscribing = recordingState === 'transcribing';

  return (
    <div className="flex flex-col gap-2">
      {micError && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded-xl px-3 py-2">
          {micError}
        </div>
      )}

      <div
        className={`flex items-end gap-2 bg-[#1e1f20] rounded-2xl px-4 py-3 border transition-colors
          ${isRecording
            ? 'border-red-500/50 bg-red-950/10'
            : 'border-[#2e2f31] focus-within:border-[#3e3f41] focus-within:bg-[#232425]'
          }`}
      >
        {/* Textarea — grows with content, no native scrollbar */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isRecording
              ? '🔴 Recording… tap mic to stop'
              : isTranscribing
              ? '⏳ Transcribing…'
              : placeholder
          }
          disabled={disabled || recordingState !== 'idle'}
          rows={1}
          className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none resize-none text-[15px] leading-6 overflow-hidden disabled:opacity-60 py-0.5"
        />

        {/* Action buttons — sit on the same baseline as the text */}
        <div className="flex items-center gap-1 shrink-0 pb-0.5">
          <button
            onClick={handleMicClick}
            disabled={disabled || isTranscribing}
            title={isRecording ? 'Stop recording' : 'Voice input'}
            className={`p-1.5 rounded-full transition-all duration-200
              ${isRecording
                ? 'text-red-400 bg-red-500/15 animate-pulse'
                : isTranscribing
                ? 'text-yellow-400 bg-yellow-500/10 cursor-wait'
                : 'text-gray-500 hover:text-white hover:bg-[#333538]'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isRecording ? <Square size={17} /> : <Mic size={17} />}
          </button>

          <button
            onClick={() => canSend && onSend(value)}
            disabled={!canSend}
            title="Send"
            className={`p-1.5 rounded-full transition-all duration-200
              ${canSend
                ? 'bg-white text-black hover:bg-gray-200'
                : 'text-gray-600 cursor-default'
              }`}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
