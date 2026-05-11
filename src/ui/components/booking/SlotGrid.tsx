import styles from './SlotGrid.module.css';

interface Props {
  slots: string[];
  takenSlots?: Set<string>;
  selected: string | null;
  onSelect: (slot: string) => void;
  date?: string;
}

export function SlotGrid({ slots, takenSlots = new Set(), selected, onSelect, date }: Props) {
  return (
    <div>
      {date && (
        <div className={styles.header}>
          <h4 className={styles.dayTitle}>{date}</h4>
          <span className="eyebrow">{slots.length} slots</span>
        </div>
      )}
      <div className={styles.grid}>
        {slots.map((slot) => {
          const taken = takenSlots.has(slot);
          return (
            <button
              key={slot}
              disabled={taken}
              onClick={() => !taken && onSelect(slot)}
              className={[
                styles.slot,
                taken ? styles.gone : '',
                selected === slot ? styles.selected : '',
              ].join(' ')}
            >
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
}
