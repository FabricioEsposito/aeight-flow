import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CentroCusto } from '@/pages/CentroCustos';

const formSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
});

interface CentroCustosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centroCusto: CentroCusto | null;
  onSuccess: () => void;
}

export default function CentroCustosDialog({
  open,
  onOpenChange,
  centroCusto,
  onSuccess,
}: CentroCustosDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo: '',
      descricao: '',
    },
  });

  useEffect(() => {
    if (centroCusto) {
      form.reset({
        codigo: centroCusto.codigo,
        descricao: centroCusto.descricao,
      });
    } else {
      form.reset({
        codigo: '',
        descricao: '',
      });
    }
  }, [centroCusto, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);

      if (centroCusto) {
        const { error } = await supabase
          .from('centros_custo')
          .update(values)
          .eq('id', centroCusto.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Centro de custo atualizado com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('centros_custo')
          .insert([{
            codigo: values.codigo,
            descricao: values.descricao,
            status: 'ativo'
          }]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Centro de custo criado com sucesso.",
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar centro de custo:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o centro de custo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {centroCusto ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}