import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ConferenciaNF } from '@/lib/conferencia-nf';

interface Nota { id: string; link_nf: string | null }

export function useConferenciaNF(notas: Nota[]) {
  const [conferencias, setConferencias] = useState<Record<string, ConferenciaNF>>({});
  const [erros, setErros] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState({ done: 0, total: 0, running: false });
  const [loadError, setLoadError] = useState<string | null>(null);
  const stopping = useRef(false);
  const running = useRef(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const all: Record<string, ConferenciaNF> = {};
      setLoadError(null);
      for (let i = 0; i < notas.length; i += 200) {
        const { data, error } = await supabase.from('conferencias_nf').select('*')
          .in('conta_receber_id', notas.slice(i, i + 200).map(n => n.id));
        if (!active) return;
        if (error) { setLoadError('Não foi possível carregar as conferências salvas.'); return; }
        for (const audit of data ?? []) all[audit.conta_receber_id] = audit;
      }
      if (active) setConferencias(all);
    }
    void load();
    return () => { active = false; };
  }, [notas]);

  useEffect(() => () => { stopping.current = true; }, []);

  async function conferir(selected: Nota[], reprocessar = false) {
    if (running.current) return;
    running.current = true;
    stopping.current = false;
    setProgress({ done: 0, total: selected.length, running: true });
    try {
      for (let i = 0; i < selected.length; i++) {
        if (stopping.current) break;
        const nota = selected[i];
        setErros(prev => { const next = { ...prev }; delete next[nota.id]; return next; });
        if (!nota.link_nf) {
          setErros(prev => ({ ...prev, [nota.id]: 'Sem PDF fiscal anexado.' }));
          setProgress(prev => ({ ...prev, done: i + 1 }));
          continue;
        }
        const { data, error } = await supabase.functions.invoke('conferir-nf', {
          body: { conta_receber_id: nota.id, reprocessar },
        });
        if (error || data?.error || !data?.conferencia) {
          let message = data?.error ?? 'Não foi possível ler o PDF fiscal.';
          let terminal = false;
          if (error?.context instanceof Response) {
            terminal = [401, 402, 403, 404, 429].includes(error.context.status) || error.context.status >= 500;
            const details = await error.context.json().catch(() => null);
            message = details?.error ?? message;
          }
          setErros(prev => ({ ...prev, [nota.id]: message }));
          if (terminal) { stopping.current = true; }
        } else {
          setConferencias(prev => ({ ...prev, [nota.id]: data.conferencia }));
        }
        setProgress(prev => ({ ...prev, done: i + 1 }));
      }
    } finally {
      running.current = false;
      setProgress(prev => ({ ...prev, running: false }));
    }
  }

  return { conferencias, erros, progress, loadError, conferir, interromper: () => { stopping.current = true; } };
}