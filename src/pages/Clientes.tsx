import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, FileDown } from "lucide-react";

export default function Clientes() {
  // Dados mock - em um sistema real viriam do Supabase
  const clientes = [
    { 
      id: 1, 
      razaoSocial: "ABC Tecnologia Ltda", 
      cnpj: "12.345.678/0001-90", 
      email: "contato@abc.com.br",
      telefone: "(11) 98765-4321",
      status: "Ativo"
    },
    { 
      id: 2, 
      razaoSocial: "XYZ Consultoria", 
      cnpj: "98.765.432/0001-10", 
      email: "admin@xyz.com.br",
      telefone: "(11) 91234-5678",
      status: "Ativo"
    },
    { 
      id: 3, 
      razaoSocial: "DEF Serviços Ltda", 
      cnpj: "11.222.333/0001-44", 
      email: "contato@def.com.br",
      telefone: "(11) 95555-4444",
      status: "Inativo"
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">Gerencie seus clientes cadastrados</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <FileDown className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button className="bg-gradient-primary hover:bg-primary-hover">
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por Razão Social ou CNPJ..."
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Todos</Button>
                <Button variant="outline" size="sm">Ativos</Button>
                <Button variant="outline" size="sm">Inativos</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clientes Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes ({clientes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientes.map((cliente) => (
                <div key={cliente.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="font-medium text-foreground">{cliente.razaoSocial}</p>
                      <p className="text-sm text-muted-foreground">{cliente.cnpj}</p>
                    </div>
                    <div>
                      <p className="text-sm text-foreground">{cliente.email}</p>
                      <p className="text-sm text-muted-foreground">{cliente.telefone}</p>
                    </div>
                    <div>
                      <Badge variant={cliente.status === "Ativo" ? "default" : "secondary"}>
                        {cliente.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}