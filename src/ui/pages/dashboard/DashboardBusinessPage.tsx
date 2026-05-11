import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useBusiness } from '../../hooks/useBusinesses';
import { useResources, useCreateResource } from '../../hooks/useResources';
import { useAvailabilityRules, useCreateAvailabilityRule, useDeleteAvailabilityRule } from '../../hooks/useAvailabilityRules';
import { AvailabilityRuleRow } from '../../components/dashboard/AvailabilityRuleRow';
import type { ResourceType } from '@domain/entities/ResourceType';
import { DAYS_ORDERED, DAY_LABELS } from '@domain/entities/ResourceAvailabilityRule';
import type { DayOfWeek } from '@domain/entities/ResourceAvailabilityRule';
import styles from './DashboardBusinessPage.module.css';

const RESOURCE_TYPES: ResourceType[] = ['EMPLOYEE', 'ROOM', 'APARTMENT', 'TABLE', 'COURT', 'VEHICLE'];

export function DashboardBusinessPage() {
  const { id } = useParams<{ id: string }>();
  const { data: business, isLoading: bLoading } = useBusiness(id!);
  const { data: resourcesPage } = useResources(id!);
  const resources = resourcesPage?.content ?? [];

  // Add resource form
  const [resourceName, setResourceName] = useState('');
  const [resourceType, setResourceType] = useState<ResourceType>('EMPLOYEE');
  const { mutateAsync: createResource, isPending: creatingResource } = useCreateResource(id!);

  // Selected resource for availability rules
  const [activeResourceId, setActiveResourceId] = useState<string | null>(null);
  const { data: rules } = useAvailabilityRules(activeResourceId ?? '');
  const { mutateAsync: createRule, isPending: creatingRule } = useCreateAvailabilityRule(activeResourceId ?? '');
  const { mutateAsync: deleteRule, isPending: deletingRule } = useDeleteAvailabilityRule(activeResourceId ?? '');

  // Add rule form
  const [ruleDay, setRuleDay] = useState<DayOfWeek>('MONDAY');
  const [ruleStart, setRuleStart] = useState('09:00');
  const [ruleEnd, setRuleEnd] = useState('17:00');

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceName.trim()) return;
    await createResource({ name: resourceName.trim(), type: resourceType });
    setResourceName('');
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeResourceId) return;
    await createRule({ dayOfWeek: ruleDay, startTime: ruleStart, endTime: ruleEnd });
  };

  if (bLoading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!business) return <div className="error-box">Business not found.</div>;

  return (
    <div>
      <div className={styles.topbar}>
        <div>
          <Link to="/dashboard/businesses" className={styles.breadcrumb}>← Businesses</Link>
          <h1 className={styles.pageTitle}>{business.name}</h1>
        </div>
      </div>

      {/* Resources section */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Resources</h2>
          <span className={styles.sectionMeta}>{resources.length} total</span>
        </div>

        <div className={styles.reqList}>
          {resources.map((r) => (
            <div key={r.id} className={styles.reqRow}>
              <div className={styles.reqMeta}>
                <span className={styles.reqName}>{r.name}</span>
                <span className={styles.reqSub}>{r.type}</span>
              </div>
              <button
                className={['btn btn-ghost btn-sm', activeResourceId === r.id ? styles.activeBtn : ''].join(' ')}
                onClick={() => setActiveResourceId(r.id === activeResourceId ? null : r.id)}
              >
                {activeResourceId === r.id ? 'Hide rules' : 'Availability rules'}
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddResource} className={styles.addForm}>
          <select
            className="form-input"
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value as ResourceType)}
          >
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            className="form-input"
            placeholder="Resource name (e.g. Anna – Stylist)"
            value={resourceName}
            onChange={(e) => setResourceName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={creatingResource}>
            + Add resource
          </button>
        </form>
      </section>

      {/* Availability rules section */}
      {activeResourceId && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Availability rules</h2>
            <span className={styles.sectionMeta}>Recurring weekly</span>
          </div>

          <div className={styles.reqList}>
            {rules?.length === 0 && (
              <div style={{ padding: '14px 20px', color: 'var(--ink-500)', fontSize: 'var(--text-sm)' }}>
                No availability rules yet.
              </div>
            )}
            {rules?.map((rule) => (
              <AvailabilityRuleRow
                key={rule.id}
                rule={rule}
                onDelete={(ruleId) => deleteRule(ruleId)}
                isDeleting={deletingRule}
              />
            ))}
          </div>

          <form onSubmit={handleAddRule} className={styles.addForm}>
            <select
              className="form-input"
              value={ruleDay}
              onChange={(e) => setRuleDay(e.target.value as DayOfWeek)}
            >
              {DAYS_ORDERED.map((d) => (
                <option key={d} value={d}>{DAY_LABELS[d]}</option>
              ))}
            </select>
            <input type="time" className="form-input" value={ruleStart}
              onChange={(e) => setRuleStart(e.target.value)} />
            <span style={{ alignSelf: 'center', color: 'var(--ink-500)', fontSize: 'var(--text-sm)' }}>to</span>
            <input type="time" className="form-input" value={ruleEnd}
              onChange={(e) => setRuleEnd(e.target.value)} />
            <button type="submit" className="btn btn-primary" disabled={creatingRule}>
              + Add rule
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
