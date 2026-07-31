import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — DashCompass" },
      { name: "description", content: "Política de Privacidade do DashCompass - Em conformidade com LGPD e requisitos de verificação do Google OAuth." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const lastUpdated = "31 de Julho de 2026";

  return (
    <div className="min-h-screen bg-background py-20 px-4 md:px-8">
      <div className="max-w-4xl mx-auto glass-strong rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl">
        <h1 className="text-4xl font-bold mb-4 text-primary uppercase tracking-tighter">Política de Privacidade</h1>
        <p className="text-xs text-muted-foreground mb-12 uppercase tracking-widest">Última atualização: {lastUpdated}</p>
        
        <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-8 leading-relaxed">
          <section className="bg-white/5 p-6 rounded-2xl border border-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Introdução e Compromisso com a LGPD</h2>
            <p>
              O <strong>DashCompass</strong> (operado por The Fcking Company LLC) está totalmente comprometido com a proteção de seus dados pessoais em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</strong> do Brasil, o <strong>GDPR</strong> e padrões internacionais de privacidade. Esta política detalha como coletamos, processamos e protegemos suas informações ao utilizar nosso software SaaS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Coleta de Dados e Finalidade</h2>
            <p>Coletamos dados para as seguintes finalidades:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Dados de Conta:</strong> Nome, e-mail e empresa para autenticação e gestão de perfil.</li>
              <li><strong>Dados de Integração:</strong> Acesso a APIs de terceiros (Google, LinkedIn, etc.) estritamente para consolidação de métricas.</li>
              <li><strong>Dados de Uso:</strong> Logs de atividade técnica para garantir a segurança e estabilidade da plataforma.</li>
            </ul>
          </section>

          <section className="bg-primary/5 p-6 rounded-2xl border border-primary/20">
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Google API Data Usage (Uso de Dados de APIs do Google)</h2>
            <div className="space-y-4">
              <p>
                O DashCompass acessa dados de serviços do Google para fornecer funcionalidades de dashboard e relatórios. O acesso ocorre exclusivamente através de autorização explícita do usuário via OAuth.
              </p>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Dados Acessados</h3>
                <p>Podemos acessar informações das seguintes APIs, conforme autorizado por você:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Google Analytics 4:</strong> Propriedades, métricas de tráfego e conversão.</li>
                  <li><strong>Google Search Console:</strong> Performance de busca, consultas e páginas.</li>
                  <li><strong>Google Ads:</strong> Campanhas, grupos de anúncios, anúncios e métricas de performance (impressões, cliques, custos).</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Finalidades do Tratamento</h3>
                <p>Estes dados são utilizados unicamente para:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Exibição de dashboards integrados na plataforma.</li>
                  <li>Geração de relatórios de marketing personalizados.</li>
                  <li>Consolidação de métricas de múltiplos canais.</li>
                  <li>Sincronização de contas e outras funcionalidades solicitadas pelo usuário.</li>
                </ul>
                <p className="mt-2 text-foreground font-medium italic">
                  Os dados não são utilizados para nenhuma finalidade diferente da experiência do usuário dentro da plataforma DashCompass.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Data Sharing (Compartilhamento de Dados)</h2>
            <p>Em relação aos dados obtidos via APIs do Google e outras integrações:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Não Venda:</strong> Os dados do Google NÃO são vendidos para terceiros.</li>
              <li><strong>Não Publicidade:</strong> NÃO são compartilhados com anunciantes ou utilizados para publicidade personalizada.</li>
              <li><strong>Não Brokers:</strong> NÃO são compartilhados com data brokers.</li>
              <li><strong>Não Perfilamento:</strong> NÃO são utilizados para criação de perfis comerciais fora da plataforma.</li>
              <li><strong>Restrição:</strong> Os dados só podem ser compartilhados quando exigido por lei ou quando estritamente necessário para operar as funcionalidades técnicas da plataforma (como processamento interno criptografado).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Artificial Intelligence and Machine Learning</h2>
            <p>
              O DashCompass valoriza a integridade dos seus dados de marketing:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Os dados provenientes das APIs do Google <strong>NÃO são utilizados</strong> para desenvolver, melhorar ou treinar modelos de Inteligência Artificial ou Machine Learning.</li>
              <li>Os dados <strong>NÃO são enviados</strong> para terceiros para fins de treinamento de IA.</li>
              <li>Qualquer recurso de IA disponível na plataforma (como o Compass AI) utiliza apenas informações autorizadas pelo usuário para fornecer insights e funcionalidades dentro da própria conta, sem reaproveitamento desses dados para treinamento de modelos globais.</li>
            </ul>
          </section>

          <section className="border-l-4 border-primary pl-6 py-2">
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Integrações Adicionais (LinkedIn, Facebook e TikTok)</h2>
            <p>
              Para conexões com LinkedIn Marketing API, Meta (Facebook/Instagram) Ads API e TikTok For Business API:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Os tokens de acesso são criptografados e armazenados em ambiente seguro.</li>
              <li>Os dados são utilizados apenas para gerar relatórios de performance solicitados pelo usuário.</li>
              <li>Mantemos isolamento total entre diferentes contas de clientes (multi-tenant isolation).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Data Security (Segurança de Dados)</h2>
            <p>
              Implementamos medidas rigorosas para proteger suas informações:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Criptografia em Trânsito:</strong> Toda comunicação entre seu navegador e nossos servidores utiliza HTTPS com TLS 1.2+.</li>
              <li><strong>Criptografia em Repouso:</strong> Tokens OAuth e credenciais sensíveis são armazenados utilizando criptografia AES-256.</li>
              <li><strong>Acesso Restrito:</strong> O acesso a credenciais de API é limitado a processos automatizados com acesso restrito e monitorado.</li>
              <li><strong>Monitoramento:</strong> Nossos servidores possuem monitoramento contínuo e controles de segurança ativos 24/7.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Data Retention and Deletion (Retenção e Exclusão)</h2>
            <p>
              Você mantém o controle total sobre seus dados:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Desconexão:</strong> Usuários podem desconectar sua Conta Google ou qualquer outra integração a qualquer momento através do painel de configurações.</li>
              <li><strong>Revogação:</strong> Os tokens OAuth podem ser revogados diretamente no console de segurança do provedor (ex: Google Security Checkup).</li>
              <li><strong>Exclusão Permanente:</strong> A exclusão da conta DashCompass remove permanentemente todos os tokens e dados relacionados de nossa base de dados em até 30 dias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Direitos do Titular (LGPD)</h2>
            <p>Em conformidade com a LGPD, garantimos a você o direito de:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Confirmação da existência de tratamento de dados.</li>
              <li>Acesso, correção e anonimização de dados incompletos ou inexatos.</li>
              <li>Eliminação de dados pessoais tratados com o consentimento do titular.</li>
              <li>Portabilidade dos dados a outro fornecedor de serviço.</li>
              <li>Informação sobre o compartilhamento de dados.</li>
            </ul>
          </section>

          <section className="bg-primary/10 p-6 rounded-2xl border border-primary/30">
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Google API Services User Data Policy Compliance</h2>
            <p className="mb-4">
              O DashCompass declara conformidade explícita com as exigências do Google:
            </p>
            <div className="bg-background/50 p-4 rounded-lg border border-white/5 font-mono text-xs mb-4">
              "The use and transfer of information received from Google APIs by DashCompass adheres to the Google API Services User Data Policy, including the Limited Use requirements."
            </div>
            <p className="italic">
              O uso e a transferência de informações recebidas das APIs do Google pelo DashCompass obedecem à Política de Dados do Usuário dos Serviços de API do Google, incluindo os requisitos de Uso Limitado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">11. Contato e DPO</h2>
            <p>
              Para exercer seus direitos ou tirar dúvidas, entre em contato com nosso Encarregado de Proteção de Dados (DPO) através do e-mail: <span className="text-primary font-mono">legal@dashcompass.com</span>
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <a href="/login" className="text-primary hover:text-primary/80 transition-colors text-sm font-bold uppercase tracking-widest">
            ← Voltar para o Dashboard
          </a>
          <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
            © 2026 The Fcking Company LLC. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}

