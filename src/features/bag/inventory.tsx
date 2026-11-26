'use client';
import { FileDropzone } from '@/components/file-dropzone';
import { EquipmentImage } from '../media';
import { useState, type FormEvent } from 'react';
import { Plus, Trash2, Pencil, ArrowUp, ArrowDown } from 'lucide-react';
import { useApp } from '../app-provider';
import { Button, Modal, Badge, Notice, PageHeader } from '@/components/ui';
import { palette } from '@/domain/equipment';
import type { Equipment, Inventory } from '@/domain/types';
export function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (s: string) => void;
  label: string;
}) {
  return (
    <fieldset className="color-picker">
      <legend>{label}</legend>
      <div>
        {Object.entries(palette).map(([name, color]) => (
          <button
            type="button"
            key={name}
            title={name}
            aria-label={name}
            aria-pressed={value === name}
            className={value === name ? 'selected' : ''}
            style={{ background: color }}
            onClick={() => onChange(name)}
          />
        ))}
      </div>
    </fieldset>
  );
}
export function InventoryScreen() {
  const app = useApp();
  const [editing, setEditing] = useState<Equipment | 'new' | null>(null),
    [failure, setFailure] = useState('');
  async function save(inv: Inventory) {
    try {
      await app.saveInventory(inv);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Enregistrement impossible.');
      throw e;
    }
  }
  async function remove(item: Equipment) {
    if (
      !confirm(`Retirer « ${item.label} » de l’inventaire ? Les sacs déjà créés restent conservés.`)
    )
      return;
    await save({
      ...app.inventory,
      equipment: app.inventory.equipment.filter((i) => i.id !== item.id),
      outfits: app.inventory.outfits.filter((o) => !o.itemIds.includes(item.id)),
    }).catch(() => {});
  }
  async function move(index: number, delta: number) {
    const list = [...app.inventory.equipment];
    [list[index], list[index + delta]] = [list[index + delta], list[index]];
    await save({ ...app.inventory, equipment: list }).catch(() => {});
  }
  return (
    <>
      <PageHeader title="Mon sac" onBack={app.back}>
        <Button onClick={() => setEditing('new')}>
          <Plus size={18} />
          Ajouter <span className="narrow-hidden">un article</span>
        </Button>
      </PageHeader>
      {failure && <Notice>{failure}</Notice>}
      <div className="inventory-list">
        {app.inventory.equipment.map((item, index) => (
          <div key={item.id} className="inventory-row">
            <div className="equipment-icon" style={{ color: palette[item.colors[0]] ?? '#003287' }}>
              <EquipmentImage item={item} />
            </div>
            <div className="inventory-label">
              <strong>{item.label}</strong>
              <span>
                {item.colors.join(' / ') || 'Matériel'}
                {item.photoId ? ' · Photo enregistrée' : ''}
              </span>
            </div>
            <div className="row-actions">
              <button
                className="icon-button"
                disabled={index === 0}
                aria-label={`Monter ${item.label}`}
                onClick={() => void move(index, -1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                className="icon-button"
                disabled={index === app.inventory.equipment.length - 1}
                aria-label={`Descendre ${item.label}`}
                onClick={() => void move(index, 1)}
              >
                <ArrowDown size={16} />
              </button>
              <button
                className="icon-button"
                aria-label={`Modifier ${item.label}`}
                onClick={() => setEditing(item)}
              >
                <Pencil size={17} />
              </button>
              <button
                className="icon-button"
                aria-label={`Supprimer ${item.label}`}
                onClick={() => void remove(item)}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <Modal
          title={editing === 'new' ? 'Nouvel article' : 'Modifier l’article'}
          onClose={() => setEditing(null)}
        >
          <ItemForm
            item={editing === 'new' ? undefined : editing}
            onSave={async (item) => {
              await save({
                ...app.inventory,
                equipment:
                  editing === 'new'
                    ? [...app.inventory.equipment, item]
                    : app.inventory.equipment.map((i) => (i.id === item.id ? item : i)),
              });
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}
function ItemForm({ item, onSave }: { item?: Equipment; onSave: (i: Equipment) => Promise<void> }) {
  const { demo } = useApp();
  const [primary, setPrimary] = useState(item?.colors[0] ?? 'noir'),
    [secondary, setSecondary] = useState(item?.colors[1] ?? ''),
    [photoId, setPhotoId] = useState(item?.photoId),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await onSave({
        id: item?.id ?? crypto.randomUUID(),
        label: String(data.get('label')).trim(),
        type: String(data.get('type')) as Equipment['type'],
        colors: [primary, ...(secondary ? [secondary] : [])],
        photoId,
        active: true,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="form"
      data-dirty={primary !== (item?.colors[0] ?? 'noir') || photoId !== item?.photoId}
    >
      <label>
        Nom de l’article
        <input name="label" defaultValue={item?.label} maxLength={100} required />
      </label>
      <label>
        Type
        <select name="type" defaultValue={item?.type ?? 'TOOL'}>
          <option value="SHIRT">Maillot</option>
          <option value="SHORTS">Short</option>
          <option value="SOCKS">Chaussettes</option>
          <option value="SHOES">Chaussures</option>
          <option value="TOOL">Matériel</option>
          <option value="OTHER">Autre</option>
        </select>
      </label>
      <ColorPicker value={primary} onChange={setPrimary} label="Couleur principale" />
      <label>
        Couleur secondaire
        <select value={secondary} onChange={(e) => setSecondary(e.target.value)}>
          <option value="">Aucune</option>
          {Object.keys(palette).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <FileDropzone
        label="Photo facultative"
        hint={
          demo ? 'Ajout de photos disponible avec un compte' : 'JPEG, PNG ou WebP · 10 Mo maximum'
        }
        disabled={demo}
        busy={busy}
        onFile={async (file) => {
          setBusy(true);
          setError('');
          try {
            const data = new FormData();
            data.set('file', file);
            const res = await fetch('/api/media', { method: 'POST', body: data });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error.message);
            setPhotoId(body.data.id);
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Photo non enregistrée');
          } finally {
            setBusy(false);
          }
        }}
      />
      {photoId && <Badge tone="green">Photo enregistrée</Badge>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? 'Enregistrement…' : 'Enregistrer l’article'}
      </Button>
    </form>
  );
}
