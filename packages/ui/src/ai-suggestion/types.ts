export interface AiSuggestionProps {
  request: () => Promise<string>;
  apply: (text: string) => void;
  onError: () => void;
  labels: { suggest: string; use: string; dismiss: string; preview: string };
  disabled?: boolean;
}
