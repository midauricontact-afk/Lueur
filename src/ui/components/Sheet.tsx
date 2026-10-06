import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { sfx } from '../../audio/sounds';
import { IconClose } from '../icons';

/**
 * Fiche qui glisse depuis le bas. On la ferme avec ✕, en touchant le fond ou en la tirant vers le bas.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  tall = false,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  tall?: boolean;
  footer?: ReactNode;
}) {
  const controls = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) {
      sfx.back();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose}>
          <motion.div
            className={`sheet${tall ? ' tall' : ''}`}
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            dragListener={false}
            dragControls={controls}
            onDragEnd={onDragEnd}
            onClick={(e) => e.stopPropagation()}
          >
            {/* On tire la fiche par son en-tête seulement : le contenu reste librement défilable. */}
            <div className="sheet-grab" onPointerDown={(e) => controls.start(e)}>
              <div className="sheet-handle" />
            </div>
            <div className="sheet-head" onPointerDown={(e) => controls.start(e)}>
              <h2>{title}</h2>
              <button className="icon-btn" onClick={onClose} aria-label="Fermer">
                <IconClose width={20} height={20} />
              </button>
            </div>
            <div className="sheet-body">
              {children}
            </div>
            {footer && <div className="sheet-footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
