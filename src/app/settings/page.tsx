import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Settings as SettingsIcon, 
  Key, 
  Webhook,
  Slack,
  Database,
  User,
  Bell,
  Shield,
  Zap,
  ExternalLink,
  Check,
  AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-freelaw-primary">
            Configurações
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie integrações, perfil e preferências da conta
          </p>
        </div>

        {/* User Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Perfil do Usuário</CardTitle>
            </div>
            <CardDescription>
              Informações da sua conta e preferências
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input id="fullName" defaultValue="João Silva" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="joao@freelaw.com" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <Input id="role" defaultValue="Administrador" disabled />
            </div>
            
            <div className="flex justify-end">
              <Button>Salvar Alterações</Button>
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <CardTitle>Integrações</CardTitle>
            </div>
            <CardDescription>
              Conecte suas ferramentas e plataformas favoritas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Fathom Integration */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-freelaw-primary/10 rounded-lg flex items-center justify-center">
                  <Webhook className="h-5 w-5 text-freelaw-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Fathom</h3>
                  <p className="text-sm text-muted-foreground">
                    Receba gravações automaticamente via webhook
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">
                  <Check className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
                <Button variant="outline" size="sm">
                  Configurar
                </Button>
              </div>
            </div>
            
            <Separator />
            
            {/* HubSpot Integration */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-freelaw-gold/20 rounded-lg flex items-center justify-center">
                  <Database className="h-5 w-5 text-freelaw-gold-dark" />
                </div>
                <div>
                  <h3 className="font-medium">HubSpot</h3>
                  <p className="text-sm text-muted-foreground">
                    Sincronize dados com seu CRM
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">
                  <Check className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Abrir
                </Button>
              </div>
            </div>
            
            <Separator />
            
            {/* Slack Integration */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-freelaw-secondary/20 rounded-lg flex items-center justify-center">
                  <Slack className="h-5 w-5 text-freelaw-secondary" />
                </div>
                <div>
                  <h3 className="font-medium">Slack</h3>
                  <p className="text-sm text-muted-foreground">
                    Notificações automáticas para a equipe
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Não configurado
                </Badge>
                <Button variant="outline" size="sm">
                  Conectar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notificações</CardTitle>
            </div>
            <CardDescription>
              Configure como e quando receber notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Novas reuniões analisadas</h3>
                <p className="text-sm text-muted-foreground">
                  Receba notificações quando uma análise for concluída
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Relatórios semanais</h3>
                <p className="text-sm text-muted-foreground">
                  Receba um resumo semanal de performance por email
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Alertas de score baixo</h3>
                <p className="text-sm text-muted-foreground">
                  Notificação quando o score médio ficar abaixo do limite
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <CardTitle>Chaves de API</CardTitle>
            </div>
            <CardDescription>
              Gerencie suas chaves para integrações personalizadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-secret">Webhook Secret (Fathom)</Label>
              <div className="flex gap-2">
                <Input 
                  id="webhook-secret" 
                  type="password" 
                  defaultValue="sk_live_••••••••••••••••••••••••••••••••"
                  readOnly
                />
                <Button variant="outline">Regenerar</Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key (FreelawSales)</Label>
              <div className="flex gap-2">
                <Input 
                  id="api-key" 
                  type="password" 
                  defaultValue="fls_••••••••••••••••••••••••••••••••"
                  readOnly
                />
                <Button variant="outline">Regenerar</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Segurança</CardTitle>
            </div>
            <CardDescription>
              Configurações de segurança e privacidade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Autenticação de dois fatores</h3>
                <p className="text-sm text-muted-foreground">
                  Adicione uma camada extra de segurança à sua conta
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Não configurado</Badge>
                <Button variant="outline" size="sm">
                  Configurar
                </Button>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label>Sessões ativas</Label>
              <div className="text-sm text-muted-foreground">
                <p>Esta sessão - Chrome no Ubuntu (atual)</p>
                <p>Última atividade: há 2 minutos</p>
              </div>
              <Button variant="outline" size="sm">
                Encerrar outras sessões
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800">Zona de Perigo</CardTitle>
            <CardDescription>
              Ações irreversíveis - use com cuidado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Deletar conta</h3>
                <p className="text-sm text-muted-foreground">
                  Remove permanentemente sua conta e todos os dados
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Deletar Conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}