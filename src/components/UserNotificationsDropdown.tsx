import { useState, useEffect } from 'react';
import { Bell, Check, X, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notificacao {
  id: string;
  user_id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  referencia_id: string | null;
  referencia_tipo: string | null;
  created_at: string;
}

export function UserNotificationsDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotificacoes();
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('user_notifications_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notificacoes',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadNotificacoes();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadNotificacoes = async () => {
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotificacoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  const handleMarcarComoLida = async (notificacaoId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', notificacaoId);

      if (error) throw error;

      loadNotificacoes();
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarTodasComoLidas = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('user_id', user?.id)
        .eq('lida', false);

      if (error) throw error;

      loadNotificacoes();
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClickNotificacao = (notificacao: Notificacao) => {
    if (!notificacao.lida) {
      handleMarcarComoLida(notificacao.id);
    }
    
    if (notificacao.referencia_tipo === 'solicitacao_ajuste') {
      navigate('/solicitacoes');
    }
  };

  const naoLidas = notificacoes.filter(n => !n.lida);

  const getNotificacaoIcon = (tipo: string) => {
    switch (tipo) {
      case 'aprovado':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'rejeitado':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {naoLidas.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {naoLidas.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[500px] overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Notificações</h3>
            {naoLidas.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarcarTodasComoLidas}
                disabled={loading}
                className="text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
          
          {notificacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma notificação
            </p>
          ) : (
            <div className="space-y-2">
              {notificacoes.map((notificacao) => (
                <div
                  key={notificacao.id}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    notificacao.lida 
                      ? 'bg-secondary/30 hover:bg-secondary/50' 
                      : 'bg-primary/10 hover:bg-primary/20 border-l-4 border-primary'
                  }`}
                  onClick={() => handleClickNotificacao(notificacao)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getNotificacaoIcon(notificacao.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${notificacao.lida ? 'text-muted-foreground' : ''}`}>
                        {notificacao.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notificacao.mensagem}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(notificacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
