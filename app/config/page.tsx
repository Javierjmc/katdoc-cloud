'use client';
// app/config/page.tsx
// Configuración de las ventanas de notificación (S13).

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { NOTIFICATION_TYPES, WINDOW_PRESETS } from '@/lib/constants';
import {
  useNotificationConfig,
  updateNotificationConfig,
  createNotificationConfig,
  deleteNotificationConfig,
} from '@/hooks/useNotificationConfig';
import type { NotificationConfig } from '@/types';

export default function ConfigPage() {
  const { configs, loading, refetch } = useNotificationConfig();
  const { toast } = useToast();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newTipo, setNewTipo] = useState(NOTIFICATION_TYPES[0].tipo);
  const [newLabel, setNewLabel] = useState('');
  const [newDias, setNewDias] = useState(21);
  const [toDelete, setToDelete] = useState<NotificationConfig | null>(null);
  const [deleting, setDeleting] = useState(false);

  const patch = async (id: string, data: Parameters<typeof updateNotificationConfig>[1]) => {
    setSavingId(id);
    const { error } = await updateNotificationConfig(id, data);
    if (error) toast(`Error: ${error}`, 'error');
    else { toast('Configuración guardada', 'success'); refetch(); }
    setSavingId(null);
  };

  const handleCreate = async () => {
    const label = newLabel.trim() || NOTIFICATION_TYPES.find(t => t.tipo === newTipo)?.label || newTipo;
    const { error } = await createNotificationConfig({ tipo: newTipo, label, dias_antes: newDias, dias_despues: 0 });
    if (error) toast(`Error: ${error}`, 'error');
    else { toast('Tipo agregado', 'success'); setShowNew(false); refetch(); }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await deleteNotificationConfig(toDelete.id);
    setDeleting(false);
    if (error) toast(`Error: ${error}`, 'error');
    else { toast('Configuración eliminada', 'success'); setToDelete(null); refetch(); }
  };

  if (loading) return <PageLoader />;

  return (
    <AppShell>
      <header className="bg-white border-b border-surface-200 px-4 lg:px-8 py-4 sticky top-0 z-20 shadow-sm">
        <h1 className="text-xl font-black text-surface-800">Ajustes de notificaciones</h1>
        <p className="text-xs text-surface-400">Ventanas de tiempo para avisar a los clientes</p>
      </header>

      <div className="px-4 lg:px-8 py-6 max-w-3xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-4 space-y-3">
          <p className="text-sm text-surface-500">
            Se avisa al cliente <strong className="text-surface-700">{'{dias_antes} días antes'}</strong> de la
            fecha límite, con una tolerancia de <strong className="text-surface-700">{'{dias_despues} días'}</strong> después.
          </p>

          <div className="space-y-2">
            {configs.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-surface-200">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-surface-800">{c.label}</p>
                  <p className="text-xs text-surface-400">{c.tipo}</p>
                </div>

                {/* Presets */}
                <div className="hidden sm:flex gap-1">
                  {WINDOW_PRESETS.map(d => (
                    <button
                      key={d}
                      onClick={() => patch(c.id, { dias_antes: d })}
                      disabled={savingId === c.id}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        c.dias_antes === d
                          ? 'bg-brand-500 text-white'
                          : 'bg-surface-100 text-surface-500 hover:bg-surface-200'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-1 text-xs text-surface-500">
                  antes
                  <input
                    type="number" min={0}
                    value={c.dias_antes}
                    onChange={e => patch(c.id, { dias_antes: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-16 px-2 py-1 rounded-lg text-sm border border-surface-200 focus:outline-none focus:border-brand-400"
                  />
                </label>

                <label className="flex items-center gap-1 text-xs text-surface-500">
                  después
                  <input
                    type="number" min={0}
                    value={c.dias_despues}
                    onChange={e => patch(c.id, { dias_despues: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-14 px-2 py-1 rounded-lg text-sm border border-surface-200 focus:outline-none focus:border-brand-400"
                  />
                </label>

                {/* Toggle enabled */}
                <button
                  onClick={() => patch(c.id, { enabled: !c.enabled })}
                  disabled={savingId === c.id}
                  aria-label={c.enabled ? 'Desactivar' : 'Activar'}
                  className={`w-11 h-6 rounded-full relative transition-colors ${c.enabled ? 'bg-brand-500' : 'bg-surface-300'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${c.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                </button>

                <button
                  onClick={() => setToDelete(c)}
                  className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs"
                  aria-label="Eliminar"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {showNew ? (
            <div className="flex flex-wrap items-end gap-2 p-3 rounded-xl border border-brand-200 bg-brand-50">
              <label className="flex-1 min-w-32">
                <span className="text-xs font-semibold text-surface-600">Tipo</span>
                <select value={newTipo} onChange={e => setNewTipo(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl text-sm border border-surface-200 bg-white">
                  {NOTIFICATION_TYPES.map(t => <option key={t.tipo} value={t.tipo}>{t.label}</option>)}
                </select>
              </label>
              <label className="flex-1 min-w-32">
                <span className="text-xs font-semibold text-surface-600">Etiqueta</span>
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Ej: Control de peso"
                  className="mt-1 w-full px-3 py-2 rounded-xl text-sm border border-surface-200 bg-white" />
              </label>
              <label>
                <span className="text-xs font-semibold text-surface-600">Días antes</span>
                <input type="number" min={0} value={newDias} onChange={e => setNewDias(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1 w-20 px-3 py-2 rounded-xl text-sm border border-surface-200 bg-white" />
              </label>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreate}>Agregar</Button>
                <Button size="sm" variant="secondary" onClick={() => setShowNew(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setShowNew(true)}>+ Agregar tipo personalizado</Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar configuración"
        message={`¿Eliminar la configuración "${toDelete?.label ?? ''}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </AppShell>
  );
}
