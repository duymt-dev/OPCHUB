export interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
}
