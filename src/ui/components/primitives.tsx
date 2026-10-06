import { motion } from 'framer-motion';
import { useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { sfx } from '../../audio/sounds';

/** Bouton avec un petit rebond au toucher et un son doux. */
export function Btn({
  variant = 'primary',
  size = 'md',
  quiet = false,
  children,
  onClick,
  ...rest
}: {
  variant?: 'primary' | 'ghost' | 'soft' | 'danger';
  size?: 'md' | 'lg' | 'sm';
  /** Sans son (quand l'action joue déjà le sien). */
  quiet?: boolean;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'style'>) {
  return (
    <motion.button
      className={`btn ${variant} ${size}`}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      onClick={(e) => {
        if (!quiet) sfx.click();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export function Chip({ active, onClick, children, tone }: { active?: boolean; onClick?: () => void; children: ReactNode; tone?: 'positive' | 'neutral' | 'hard' }) {
  return (
    <motion.button
      className={`chip${active ? ' active' : ''}${tone ? ` ${tone}` : ''}`}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 520, damping: 20 }}
      onClick={() => {
        sfx.select();
        onClick?.();
      }}
      aria-pressed={active}
    >
      {children}
    </motion.button>
  );
}

/** Curseur doux de 0 à 100. */
export function Slider({
  label,
  value,
  onChange,
  left,
  right,
  emoji,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  left: string;
  right: string;
  emoji: string;
}) {
  const last = useRef(0);
  return (
    <div className="slider">
      <div className="slider-head">
        <span>
          <span className="slider-emoji">{emoji}</span> {label}
        </span>
        <strong>{value} %</strong>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        aria-label={label}
        style={{ ['--pct' as string]: `${value}%` }}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Math.abs(v - last.current) >= 10) {
            sfx.tick();
            last.current = v;
          }
          onChange(v);
        }}
      />
      <div className="slider-ends">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <motion.button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch${checked ? ' on' : ''}`}
      onClick={() => {
        sfx.toggle();
        onChange(!checked);
      }}
      whileTap={{ scale: 0.92 }}
    >
      <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 32 }} className="switch-knob" />
    </motion.button>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={String(o.id)}
          role="tab"
          aria-selected={value === o.id}
          className={value === o.id ? 'active' : ''}
          onClick={() => {
            sfx.select();
            onChange(o.id);
          }}
        >
          {value === o.id && <motion.span layoutId={`seg-${options.map((x) => x.id).join('')}`} className="seg-pill" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
          <span className="seg-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
