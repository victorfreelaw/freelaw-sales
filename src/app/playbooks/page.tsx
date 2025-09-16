import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Edit, Plus, Target, Users } from 'lucide-react';

export default function PlaybooksPage() {
  const fakePlaybooks = [
    {
      id: '1',
      name: 'Script de Vendas V2.1',
      type: 'script',
      lastUpdated: '2023-12-15',
      status: 'active',
      description: 'Script principal para reuniões de descoberta e proposta',
    },
    {
      id: '2', 
      name: 'ICP - Escritórios Médios',
      type: 'icp',
      lastUpdated: '2023-12-10',
      status: 'active',
      description: 'Perfil de cliente ideal para escritórios de 10-50 advogados',
    },
    {
      id: '3',
      name: 'Script de Follow-up',
      type: 'script',
      lastUpdated: '2023-12-05',
      status: 'draft',
      description: 'Script para reuniões de follow-up e fechamento',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-freelaw-primary">
              Playbooks
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie scripts de vendas e perfis de clientes ideais (ICP)
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline">
              <Target className="h-4 w-4 mr-2" />
              Novo ICP
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Script
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scripts Ativos</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">
                +1 em desenvolvimento
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ICPs Configurados</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground">
                Cobertura: escritórios médios
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">78</div>
              <p className="text-xs text-muted-foreground">
                Aderência aos scripts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Playbooks List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Seus Playbooks</h2>
          
          <div className="grid gap-4">
            {fakePlaybooks.map((playbook) => (
              <Card key={playbook.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{playbook.name}</CardTitle>
                      <CardDescription>{playbook.description}</CardDescription>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={playbook.status === 'active' ? 'default' : 'secondary'}
                      >
                        {playbook.status === 'active' ? 'Ativo' : 'Rascunho'}
                      </Badge>
                      
                      <Badge variant="outline">
                        {playbook.type === 'script' ? 'Script' : 'ICP'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Atualizado em {new Date(playbook.lastUpdated).toLocaleDateString('pt-BR')}
                    </span>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      
                      <Button variant="outline" size="sm">
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Empty State for new users */}
        <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Configure seus primeiros playbooks</h3>
          <p className="text-muted-foreground mb-4">
            Scripts e ICPs bem definidos são fundamentais para análises precisas
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline">
              <Target className="h-4 w-4 mr-2" />
              Criar ICP
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Criar Script
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}