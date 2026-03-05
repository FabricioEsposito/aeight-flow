import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Settings2, CheckCircle, AlertTriangle } from "lucide-react";
import { formatCurrencyWithSymbol } from "@/hooks/useCotacaoMoedas";

interface FerramentasTableProps {
  ferramentas: any[];
  loading: boolean;
  cotacoes?: Record<string, { cotacao: number; data: string } | null>;
  onEdit: (ferramenta: any) => void;
  onManageLicencas: (ferramenta: any) => void;
}

export function FerramentasTable({ ferramentas, loading, cotacoes, onEdit, onManageLicencas }: FerramentasTableProps) {
  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando ferramentas...</div>;
  }

  if (ferramentas.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Nenhuma ferramenta cadastrada</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Centros de Custo</TableHead>
            <TableHead className="text-right">Valor Mensal</TableHead>
            <TableHead className="text-right">Soma Licenças</TableHead>
            <TableHead className="text-center">Licenças</TableHead>
            <TableHead className="text-center">Vencimento</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="w-24">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ferramentas.map((f: any) => {
            const moeda = f.moeda || "BRL";
            const valorMensal = Number(f.valor_mensal || 0);
            const valorMensalBRL = f.valor_mensal_brl ?? valorMensal;
            const somaLicencasBRL = f.licencas_soma_brl ?? f.licencas_soma ?? 0;
            const qtdLicencas = (f.licencas_count as number) || 0;
            const valido = Math.abs(somaLicencasBRL - valorMensalBRL) < 0.01;
            const ccDistribution = f.cc_distribution || [];
            const isForeign = moeda !== "BRL";

            return (
              <TableRow key={f.id} className="cursor-pointer" onClick={() => onManageLicencas(f)}>
                <TableCell className="font-medium">
                  <div>
                    {f.nome}
                    {isForeign && (
                      <Badge variant="outline" className="ml-2 text-xs">{moeda}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {ccDistribution.length > 0 ? ccDistribution.map((cc: any) => (
                      <Badge key={cc.id} variant="outline" className="text-xs">
                        {cc.descricao} {cc.percentual.toFixed(0)}%
                      </Badge>
                    )) : (
                      <span className="text-muted-foreground text-xs">Sem licenças</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div>
                    {isForeign && (
                      <span className="text-xs text-muted-foreground block">
                        {formatCurrencyWithSymbol(valorMensal, moeda)}
                      </span>
                    )}
                    <span>{formatBRL(valorMensalBRL)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span>{formatBRL(somaLicencasBRL)}</span>
                </TableCell>
                <TableCell className="text-center">{qtdLicencas}</TableCell>
                <TableCell className="text-center">
                  {qtdLicencas === 0 ? (
                    <Badge variant="secondary">Sem licenças</Badge>
                  ) : valido ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" /> OK
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Divergente
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(f)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onManageLicencas(f)}>
                      <Settings2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
