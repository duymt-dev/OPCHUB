'use client';
import { useState } from 'react';
import type { AiSuggestionProps } from '../types';

export function useAiSuggestion(p: AiSuggestionProps) {
  const [pending, setPending] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const suggest = async () => {
    if (pending) return;
    setPending(true);
    setText(null);
    try {
      setText(await p.request());
    } catch {
      p.onError();
    } finally {
      setPending(false);
    }
  };
  const dismiss = () => setText(null);
  const apply = () => {
    if (text !== null) {
      p.apply(text);
      dismiss();
    }
  };
  return { pending, text, suggest, dismiss, apply };
}
