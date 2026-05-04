import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { colors, fonts, radius, transitions } from '../lib/designSystem';

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
        borderRadius: radius.md,
        border: `1px solid ${colors.border}`,
        background: copied ? colors.successBg : colors.bgInput,
        color: copied ? colors.success : colors.fgMuted,
        fontSize: '11px',
        fontFamily: fonts.mono,
        cursor: 'pointer',
        transition: transitions.fast,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        if (!copied) (e.currentTarget as HTMLButtonElement).style.color = colors.fg;
      }}
      onMouseLeave={e => {
        if (!copied) (e.currentTarget as HTMLButtonElement).style.color = colors.fgMuted;
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
