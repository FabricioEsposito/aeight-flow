import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Download,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  Apple,
  MonitorSmartphone,
} from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { useToast } from "@/hooks/use-toast";

export default function Install() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canPrompt, promptInstall, isStandalone, platform } = usePwaInstall();

  const handleInstallClick = async () => {
    const result = await promptInstall();
    if (result.outcome === "accepted") {
      toast({
        title: "App instalado!",
        description: "O A&EIGHT já está disponível na sua tela inicial.",
      });
    } else if (result.outcome === "unavailable") {
      toast({
        title: "Instalação não disponível neste navegador",
        description: "Siga as instruções abaixo para instalar manualmente.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Hero */}
        <Card className="mb-6 overflow-hidden border-primary/20">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden shadow-lg">
              <img
                src="/icons/icon-512.png"
                alt="A&EIGHT app icon"
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
            <CardTitle className="text-2xl md:text-3xl">
              Instalar A&amp;EIGHT no seu celular
            </CardTitle>
            <CardDescription className="text-base">
              Tenha o sistema sempre à mão, com ícone na tela inicial e abertura em tela cheia.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {isStandalone ? (
              <Badge variant="secondary" className="text-sm py-1.5 px-3">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                App já instalado
              </Badge>
            ) : (
              <>
                {canPrompt && (
                  <Button size="lg" onClick={handleInstallClick} className="w-full md:w-auto">
                    <Download className="w-5 h-5 mr-2" />
                    Instalar agora
                  </Button>
                )}
                <p className="text-xs text-muted-foreground text-center">
                  Plataforma detectada:{" "}
                  <span className="font-medium">
                    {platform === "ios"
                      ? "iPhone / iPad"
                      : platform === "android"
                        ? "Android"
                        : platform === "desktop"
                          ? "Computador"
                          : "Outro"}
                  </span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Instructions per platform */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* iOS */}
          <Card className={platform === "ios" ? "border-primary/40 shadow-md" : ""}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Apple className="w-5 h-5" />
                <CardTitle className="text-lg">iPhone / iPad</CardTitle>
                {platform === "ios" && (
                  <Badge variant="default" className="ml-auto text-xs">Você está aqui</Badge>
                )}
              </div>
              <CardDescription>Use o navegador <strong>Safari</strong>.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">1</span>
                  <span>Toque no botão <Share className="inline w-4 h-4 mx-1" /> <strong>Compartilhar</strong> na barra inferior do Safari.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">2</span>
                  <span>Role e selecione <PlusSquare className="inline w-4 h-4 mx-1" /> <strong>Adicionar à Tela de Início</strong>.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">3</span>
                  <span>Confirme em <strong>Adicionar</strong>. O ícone do A&amp;EIGHT aparecerá na sua tela inicial.</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Android */}
          <Card className={platform === "android" ? "border-primary/40 shadow-md" : ""}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                <CardTitle className="text-lg">Android</CardTitle>
                {platform === "android" && (
                  <Badge variant="default" className="ml-auto text-xs">Você está aqui</Badge>
                )}
              </div>
              <CardDescription>Use o <strong>Chrome</strong> ou <strong>Edge</strong>.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">1</span>
                  <span>Toque no botão <strong>Instalar agora</strong> acima — ou abra o menu (⋮) do navegador.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">2</span>
                  <span>Selecione <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">3</span>
                  <span>Confirme. O A&amp;EIGHT aparecerá com seu ícone próprio, como qualquer outro app.</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Desktop */}
          <Card className={`md:col-span-2 ${platform === "desktop" ? "border-primary/40 shadow-md" : ""}`}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MonitorSmartphone className="w-5 h-5" />
                <CardTitle className="text-lg">Computador (Windows / Mac)</CardTitle>
                {platform === "desktop" && (
                  <Badge variant="default" className="ml-auto text-xs">Você está aqui</Badge>
                )}
              </div>
              <CardDescription>
                No <strong>Chrome</strong> ou <strong>Edge</strong>, instale como app de desktop.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">1</span>
                  <span>Procure o ícone <Download className="inline w-4 h-4 mx-1" /> na barra de endereço, à direita.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">2</span>
                  <span>Clique nele e confirme em <strong>Instalar</strong>. O A&amp;EIGHT abrirá em janela própria, sem barras do navegador.</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          O app instalado utiliza a mesma conta e dados da versão web — não é necessário cadastro adicional.
        </p>
      </div>
    </div>
  );
}
