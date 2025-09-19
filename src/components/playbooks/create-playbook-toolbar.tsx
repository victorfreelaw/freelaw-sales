'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';

interface CreatePlaybookToolbarProps {
  scriptForm: React.ReactNode;
  icpForm: React.ReactNode;
}

export function CreatePlaybookToolbar({ scriptForm, icpForm }: CreatePlaybookToolbarProps) {
  const [activePanel, setActivePanel] = useState<'script' | 'icp' | null>(null);

  const toggle = (panel: 'script' | 'icp') => {
    setActivePanel((current) => (current === panel ? null : panel));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => toggle('script')}
          variant={activePanel === 'script' ? 'default' : 'outline'}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Script
        </Button>
        <Button
          type="button"
          onClick={() => toggle('icp')}
          variant={activePanel === 'icp' ? 'default' : 'outline'}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo ICP
        </Button>
      </div>

      {activePanel === 'script' ? (
        <Card className="p-6 shadow-sm border-dashed border-2 border-freelaw-primary/40 space-y-4">
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setActivePanel(null)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
          {scriptForm}
        </Card>
      ) : null}

      {activePanel === 'icp' ? (
        <Card className="p-6 shadow-sm border-dashed border-2 border-freelaw-primary/40 space-y-4">
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setActivePanel(null)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
          {icpForm}
        </Card>
      ) : null}
    </div>
  );
}
