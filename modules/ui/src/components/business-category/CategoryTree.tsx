import type { BusinessCategory } from '@domain';
import styles from './CategoryTree.module.css';

interface CategoryNode extends BusinessCategory {
  children: CategoryNode[];
}

function buildTree(flat: BusinessCategory[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  flat.forEach((c) => map.set(c.id, { ...c, children: [] }));

  const roots: CategoryNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sort = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

interface Props {
  categories: BusinessCategory[];
  onEdit: (category: BusinessCategory) => void;
  onDelete: (category: BusinessCategory) => void;
}

function CategoryRow({
  node,
  depth,
  onEdit,
  onDelete,
}: {
  node: CategoryNode;
  depth: number;
  onEdit: (c: BusinessCategory) => void;
  onDelete: (c: BusinessCategory) => void;
}) {
  return (
    <>
      <div className={styles.row} style={{ paddingLeft: `${20 + depth * 24}px` }}>
        <div className={styles.nameWrapper}>
          {depth > 0 && <span className={styles.indent} />}
          <span className={styles.name}>{node.name}</span>
        </div>
        <div className={styles.rowActions}>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(node)}>
            Edit
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(node)}>
            Delete
          </button>
        </div>
      </div>
      {node.children.map((child) => (
        <CategoryRow
          key={child.id}
          node={child}
          depth={depth + 1}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

export function CategoryTree({ categories, onEdit, onDelete }: Props) {
  const tree = buildTree(categories);

  if (tree.length === 0) {
    return <div className={styles.empty}>No categories yet. Create your first one above.</div>;
  }

  return (
    <div className={styles.tree}>
      {tree.map((node) => (
        <CategoryRow key={node.id} node={node} depth={0} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
