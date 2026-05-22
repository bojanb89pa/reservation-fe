import type { ResourceAvailabilityRule } from '@domain';
import { DAY_LABELS } from '@domain';
import styles from './AvailabilityRuleRow.module.css';

interface Props {
  rule: ResourceAvailabilityRule;
  onDelete: (ruleId: string) => void;
  isDeleting?: boolean;
}

function timeToPercent(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return ((h * 60 + m) / (24 * 60)) * 100;
}

export function AvailabilityRuleRow({ rule, onDelete, isDeleting }: Props) {
  const startPct = timeToPercent(rule.startTime);
  const endPct = timeToPercent(rule.endTime);
  const widthPct = endPct - startPct;

  return (
    <div className={styles.rule}>
      <span className={styles.day}>{DAY_LABELS[rule.dayOfWeek]}</span>
      <div className={styles.hours}>
        <span className={styles.time}>{rule.startTime}</span>
        <div className={styles.bar}>
          <div className={styles.block} style={{ left: `${startPct}%`, width: `${widthPct}%` }} />
        </div>
        <span className={styles.time}>{rule.endTime}</span>
      </div>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => rule.id && onDelete(rule.id)}
        disabled={isDeleting}
      >
        Delete
      </button>
    </div>
  );
}
