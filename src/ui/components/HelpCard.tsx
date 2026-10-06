import { motion } from 'framer-motion';
import { HELP_NUMBERS } from '../../core/safety';
import { IconHeart, IconPhone } from '../icons';

/**
 * Carte d'aide, affichée avec douceur si tes mots laissent voir une grande détresse (ou à tout moment depuis les réglages).
 * Pas de ton alarmiste : on propose, on ne dramatise pas.
 */
export function HelpCard({ compact = false, onDismiss }: { compact?: boolean; onDismiss?: () => void }) {
  return (
    <motion.section
      className={`help-card${compact ? ' compact' : ''}`}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ type: 'spring', damping: 24, stiffness: 260 }}
      aria-label="Besoin d’en parler ?"
    >
      <div className="help-head">
        <span className="help-icon">
          <IconHeart width={22} height={22} />
        </span>
        <div>
          <h3>Tu n’as pas à traverser cela sans soutien</h3>
          <p>
            {compact
              ? 'Si ce que tu ressens est très lourd, des personnes formées t’écoutent, gratuitement.'
              : 'Ce que tu écris montre que c’est très lourd en ce moment. Merci de l’avoir posé ici. Des personnes formées sont là pour t’écouter, jour et nuit, sans te juger.'}
          </p>
        </div>
      </div>
      <div className="help-numbers">
        {HELP_NUMBERS.map((h) => (
          <a key={h.number} className="help-number" href={`tel:${h.number}`}>
            <IconPhone width={20} height={20} />
            <span>
              <strong>{h.number}</strong>
              <small>{h.label}</small>
            </span>
          </a>
        ))}
      </div>
      {!compact && (
        <ul className="help-details">
          {HELP_NUMBERS.map((h) => (
            <li key={h.number}>
              <b>{h.number}</b> — {h.detail}
            </li>
          ))}
        </ul>
      )}
      {onDismiss && (
        <button className="help-dismiss" onClick={onDismiss}>
          Ça va aller, merci
        </button>
      )}
    </motion.section>
  );
}
