import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface Props {
  text: string;
  className?: string;
}

export function CopyButton({ text, className = '' }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '5px 10px',
        borderRadius: '6px',
        border: '1px solid #1c1c22',
        background: copied ? '#14532d' : '#18181b',
        color: copied ? '#86efac' : '#71717a',
        fontSize: '11px',
        fontFamily: '"JetBrains Mono", monospace',
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        if (!copied) (e.currentTarget as HTMLButtonElement).style.color = '#fafafa';
      }}
      onMouseLeave={e => {
        if (!copied) (e.currentTarget as HTMLButtonElement).style.color = '#71717a';
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
