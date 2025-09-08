import { 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Users, 
  AlertCircle,
  CalendarDays
} from "lucide-react";
import { StatsCard } from "./StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Dashboard() {
  // Dados mock - em um sistema real viriam do Supabase
  const stats = [
    {
      title: "Contas a Receber",
      value: "R$ 45.231,20",
      change: "+20,1% em relação ao mês anterior",
      changeType: "positive" as const,
      icon: TrendingUp
    },
    {
      title: "Contas a Pagar", 
      value: "R$ 12.420,50",
      change: "-4,3% em relação ao mês anterior",
      changeType: "positive" as const,
      icon: TrendingDown
    },
    {
      title: "Saldo Total",
      value: "R$ 32.810,70",
      change: "+12,5% em relação ao mês anterior", 
      changeType: "positive" as const,
      icon: CreditCard
    },
    {
      title: "Clientes Ativos",
      value: "127",
      change: "+3 novos este mês",
      changeType: "positive" as const,
      icon: Users
    }
  ];

  const recentActivities = [
    { id: 1, type: "Receita", description: "Pagamento Cliente ABC Ltda", amount: "R$ 2.500,00", date: "Hoje" },
    { id: 2, type: "Despesa", description: "Fornecedor XYZ", amount: "R$ 850,00", date: "Ontem" },
    { id: 3, type: "Receita", description: "Contrato Mensal - Cliente DEF", amount: "R$ 1.200,00", date: "2 dias atrás" },
  ];

  const alerts = [
    { id: 1, message: "5 contas vencem nos próximos 3 dias", type: "warning", urgent: true },
    { id: 2, message: "Contrato da Cliente ABC renovação em 15 dias", type: "info", urgent: false },
    { id: 3, message: "Meta de vendas do mês: 78% concluída", type: "success", urgent: false },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="w-4 h-4" />
          Última atualização: agora
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Atividades Recentes
              <Button variant="ghost" size="sm">Ver todas</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={activity.type === "Receita" ? "default" : "secondary"} className="text-xs">
                      {activity.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{activity.date}</span>
                  </div>
                  <p className="font-medium text-foreground mt-1">{activity.description}</p>
                </div>
                <div className={cn(
                  "font-bold text-sm",
                  activity.type === "Receita" ? "text-success" : "text-muted-foreground"
                )}>
                  {activity.amount}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Alerts & Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Alertas & Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className={cn(
                "p-3 rounded-lg border transition-colors",
                alert.urgent ? "border-warning bg-warning-light" : "border-border hover:bg-secondary/50"
              )}>
                <div className="flex items-start justify-between">
                  <p className="text-sm text-foreground flex-1">{alert.message}</p>
                  <Badge 
                    variant={
                      alert.type === "warning" ? "destructive" : 
                      alert.type === "success" ? "default" : "secondary"
                    }
                    className="ml-2 text-xs"
                  >
                    {alert.type === "warning" ? "Urgente" : 
                     alert.type === "success" ? "Positivo" : "Info"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}