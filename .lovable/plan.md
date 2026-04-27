## Versão Mobile via PWA (Progressive Web App)

Tornar o aeight-flow instalável em qualquer celular (iPhone/Android) diretamente pelo navegador, mantendo 100% das funcionalidades atuais e com a mesma base de código.

### O que o usuário vai ganhar

1. **Ícone do app na tela inicial** do celular (com o logo A&EIGHT)
2. **Abertura em tela cheia**, sem barra do navegador — visual de app nativo
3. **Splash screen** ao abrir
4. **Tela `/install`** com instruções passo a passo de instalação para iPhone e Android
5. **Botão "Instalar app"** que aparece automaticamente quando o navegador suporta o prompt nativo (Android/Chrome)
6. **Funciona offline para navegação básica** (cache do shell da aplicação) — operações que dependem de dados continuam exigindo internet

### Escopo técnico

#### 1. Configuração PWA
- Instalar `vite-plugin-pwa` e configurar em `vite.config.ts`:
  - `registerType: "autoUpdate"`
  - `devOptions: { enabled: false }` (evita interferência no preview do Lovable)
  - `navigateFallbackDenylist: [/^\/~oauth/, /^\/auth/]` (rotas de autenticação não cacheadas)
- Manifest (`manifest.webmanifest`) com:
  - `name: "A&EIGHT Flow"`, `short_name: "A&EIGHT"`
  - `display: "standalone"`, `orientation: "portrait"`
  - `theme_color` e `background_color` alinhados ao tema A&EIGHT (azul #2563EB / fundo escuro)
  - `start_url: "/"`, `scope: "/"`

#### 2. Ícones e splash
- Gerar ícones em múltiplas resoluções (192x192, 512x512, maskable, apple-touch-icon 180x180) a partir do logo atual
- Adicionar tags `<link rel="apple-touch-icon">` e meta tags iOS (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`) em `index.html`

#### 3. Guard de registro do Service Worker
- Em `src/main.tsx`, registrar SW **somente** quando não estiver em iframe e não for host de preview Lovable. Em ambientes de preview, desregistrar SWs existentes para evitar cache stale.

#### 4. Página `/install`
- Nova rota pública `/install` com:
  - Detecção de plataforma (iOS Safari, Android Chrome, desktop)
  - Instruções visuais por plataforma
  - Botão "Instalar agora" usando o evento `beforeinstallprompt` (Android)
  - Para iOS: instruções "Compartilhar → Adicionar à Tela de Início"
- Link para `/install` no menu do usuário (avatar) e/ou banner discreto em telas mobile

#### 5. Ajustes de responsividade prioritários
Revisão das áreas mais usadas no celular para garantir boa experiência:
- **Extrato**: tabela com scroll horizontal otimizado, cards de resumo empilhados, botões de ação acessíveis com polegar
- **Aprovações (RH e Financeiro)**: cards verticais ao invés de tabelas largas no mobile
- **Dashboards**: gráficos responsivos já existem, validar legibilidade
- **Diálogos** (Novo Lançamento, Conciliar Extrato): garantir que ocupem tela cheia em mobile com scroll interno

#### 6. Aviso ao usuário sobre comportamento no editor
- Documentar (no chat, ao concluir) que o PWA **só funciona em produção** (`https://aeight-flow.lovable.app` ou domínio customizado), não no preview do Lovable. Isso é uma limitação proposital para evitar problemas de cache durante o desenvolvimento.

### Arquivos a criar/editar

**Criar:**
- `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`
- `src/pages/Install.tsx` — página de instalação com instruções por plataforma
- `src/hooks/usePwaInstall.ts` — hook que captura `beforeinstallprompt` e expõe função `promptInstall()`

**Editar:**
- `vite.config.ts` — adicionar `VitePWA` com config segura para Lovable
- `index.html` — meta tags iOS, theme-color, apple-touch-icon
- `src/main.tsx` — guard de registro de SW (não registrar em iframe/preview)
- `src/App.tsx` — adicionar rota `/install` (pública, sem ProtectedRoute)
- `src/components/layout/AppHeader.tsx` ou menu do usuário — link "Instalar app"
- `package.json` — adicionar dependência `vite-plugin-pwa`

**Não mexer:**
- Lógica de negócio existente (Extrato, Conciliação, Contratos, RH, etc.) permanece intacta
- Autenticação Supabase já é compatível com PWA

### Fluxo de uso final

1. Usuário acessa `https://aeight-flow.lovable.app` pelo celular
2. **Android/Chrome**: aparece prompt automático "Instalar app" ou ele acessa `/install` e clica em "Instalar agora"
3. **iPhone/Safari**: acessa `/install`, segue instruções "Compartilhar → Adicionar à Tela de Início"
4. Ícone A&EIGHT aparece na tela inicial
5. Ao tocar no ícone, app abre em tela cheia com splash screen, login Supabase e acesso a todas as funcionalidades

### Próximo passo (após aprovação)

Implemento tudo acima, faço o build e te oriento a clicar em **Publish → Update** para que a versão PWA fique ativa em `aeight-flow.lovable.app`. Após isso, basta abrir esse link no celular para instalar.

Se mais para frente você quiser publicar nas lojas (App Store/Google Play), adicionamos o Capacitor por cima desta base — sem retrabalho.