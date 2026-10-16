'use client';

import type { BotScript, Persona } from '@opchub/shared/api-domains';
import { emptyPersona, emptyScript, personaToForm, scriptToForm } from '../model';
import type { GroupRef } from '../types';
import { PersonaDrawer } from './persona-drawer';
import { ScriptDrawer } from './script-drawer';

interface Props {
  tab: string;
  drawer: string | null;
  personas: Persona[];
  scripts: BotScript[];
  groups: GroupRef[];
  onClose: () => void;
}

/** Drawer theo URL: `/bots/personas/new|:id`, `/bots/scripts/new|:id` */
export function BotDrawers({ tab, drawer, personas, scripts, groups, onClose }: Props) {
  if (!drawer) return null;
  if (tab === 'persona') {
    const p = drawer === 'new' ? null : personas.find((x) => x.id === drawer);
    if (drawer !== 'new' && !p) return null;
    return (
      <PersonaDrawer
        key={drawer}
        initial={p ? personaToForm(p) : emptyPersona(personas.length)}
        groups={groups}
        onClose={onClose}
      />
    );
  }
  if (tab === 'script') {
    const s = drawer === 'new' ? null : scripts.find((x) => x.id === drawer);
    if (drawer !== 'new' && !s) return null;
    return (
      <ScriptDrawer
        key={drawer}
        initial={s ? scriptToForm(s) : emptyScript(personas.map((x) => x.id))}
        groups={groups}
        personas={personas}
        onClose={onClose}
      />
    );
  }
  return null;
}
