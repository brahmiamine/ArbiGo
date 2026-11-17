'use client';
import { FileDropzone } from '@/components/file-dropzone';
import { EquipmentImage } from '../media';
import { useState, type FormEvent } from 'react';
import { Plus, Shirt, Trash2, Pencil, ArrowUp, ArrowDown } from 'lucide-react';
import { useApp } from '../app-provider';
import { Button, Modal, Empty, Badge, Notice } from '@/components/ui';
import { palette } from '@/domain/equipment';
import type { Equipment, Inventory, Outfit } from '@/domain/types';
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
    [outfit, setOutfit] = useState(false),
    [failure, setFailure] = useState('');
  const view = app.inventoryView;
  const setView = app.setInventoryView;
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
      <div className="page-heading">
        <div>
          <div className="eyebrow">VOTRE MATÉRIEL, TOUJOURS PRÊT</div>
          <h1>
            Mon sac<span className="gold">.</span>
          </h1>
          <p>Un inventaire réutilisable. Un sac indépendant pour chaque rencontre.</p>
        </div>
        <Button onClick={() => (view === 'items' ? setEditing('new') : setOutfit(true))}>
          <Plus size={18} />
          {view === 'items' ? 'Ajouter un article' : 'Assembler une tenue'}
        </Button>
      </div>
      <div className="tabs">
        <button
          className={view === 'items' ? 'selected' : ''}
          aria-pressed={view === 'items'}
          onClick={() => setView('items')}
        >
          Mon inventaire · {app.inventory.equipment.length}
        </button>
        <button
          className={view === 'outfits' ? 'selected' : ''}
          aria-pressed={view === 'outfits'}
          onClick={() => setView('outfits')}
        >
          Mes tenues · {app.inventory.outfits.length}
        </button>
      </div>
      {failure && <Notice>{failure}</Notice>}
      {view === 'items' ? (
        <>
          <p className="muted small">
            Prérempli à partir des suggestions de formation FFF. Personnalisez-le selon vos besoins.
          </p>
          <div className="inventory-list">
            {app.inventory.equipment.map((item, index) => (
              <div key={item.id} className="inventory-row">
                <div
                  className="equipment-icon"
                  style={{ color: palette[item.colors[0]] ?? '#003287' }}
                >
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
        </>
      ) : (
        <div className="outfit-grid">
          {app.inventory.outfits.map((o) => (
            <div key={o.id} className="outfit-card">
              <div
                className="outfit-art"
                style={{ background: `${palette[o.primaryColor] ?? '#003287'}12` }}
              >
                <Shirt
                  size={90}
                  strokeWidth={1}
                  fill={palette[o.primaryColor] ?? '#003287'}
                  color={palette[o.primaryColor] ?? '#003287'}
                />
              </div>
              <div className="outfit-title">
                <h2>{o.name}</h2>
                <button
                  className="icon-button"
                  aria-label={`Supprimer ${o.name}`}
                  onClick={() =>
                    void save({
                      ...app.inventory,
                      outfits: app.inventory.outfits.filter((x) => x.id !== o.id),
                    }).catch(() => {})
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <p>
                {o.itemIds
                  .map((id) => app.inventory.equipment.find((i) => i.id === id)?.label)
                  .join(' · ')}
              </p>
              <Badge>
                {o.primaryColor}
                {o.secondaryColor ? ` / ${o.secondaryColor}` : ''}
              </Badge>
            </div>
          ))}
          {!app.inventory.outfits.length && (
            <Empty
              title="Assemblez votre première tenue"
              description="Un maillot, un short, des chaussettes et des chaussures."
            >
              <Button onClick={() => setOutfit(true)}>Créer une tenue</Button>
            </Empty>
          )}
        </div>
      )}
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
      {outfit && (
        <Modal title="Assembler une tenue" onClose={() => setOutfit(false)}>
          <OutfitForm
            onSave={async (o) => {
              await save({ ...app.inventory, outfits: [...app.inventory.outfits, o] });
              setOutfit(false);
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
    <form onSubmit={submit} className="form">
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
function OutfitForm({ onSave }: { onSave: (o: Outfit) => Promise<void> }) {
  const { inventory } = useApp();
  const [primary, setPrimary] = useState('jaune'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const slots = [
    ['SHIRT', 'Maillot'],
    ['SHORTS', 'Short'],
    ['SOCKS', 'Chaussettes'],
    ['SHOES', 'Chaussures'],
  ];
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const data = new FormData(e.currentTarget);
        try {
          await onSave({
            id: crypto.randomUUID(),
            name: String(data.get('name')),
            itemIds: slots.map(([type]) => String(data.get(type))),
            primaryColor: primary,
            secondaryColor: String(data.get('secondary') ?? '') || undefined,
          });
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Erreur');
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Nom de la tenue
        <input name="name" placeholder="La jaune" maxLength={100} required />
      </label>
      <div className="form-grid">
        {slots.map(([type, label]) => (
          <label key={type}>
            {label}
            <select name={type} required defaultValue="">
              <option value="" disabled>
                Choisir…
              </option>
              {inventory.equipment
                .filter((i) => i.type === type)
                .map((i) => (
                  <option value={i.id} key={i.id}>
                    {i.label}
                  </option>
                ))}
            </select>
          </label>
        ))}
      </div>
      <ColorPicker value={primary} onChange={setPrimary} label="Couleur principale du maillot" />
      <label>
        Couleur secondaire du maillot
        <select name="secondary">
          <option value="">Aucune</option>
          {Object.keys(palette).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        Enregistrer la tenue
      </Button>
    </form>
  );
}
