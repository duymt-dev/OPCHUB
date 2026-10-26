/** Dấu tích + biểu tượng Gọi vốn của thẻ (nét theo prototype) */
export function CheckIcon({
  size,
  stroke,
  width,
}: {
  size: number;
  stroke: string;
  width: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function FundIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v18M7 8h7a3 3 0 010 6H8a3 3 0 000 6h9" />
    </svg>
  );
}
