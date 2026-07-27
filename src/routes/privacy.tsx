import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — DashCompass" },
      { name: "description", content: "Política de Privacidade e Termos de Uso do DashCompass - Em conformidade com LGPD e requisitos do Google, LinkedIn, TikTok e Facebook." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const lastUpdated = "27 de Julho de 2026";

  return (
    <div className="min-h-screen bg-background py-20 px-4 md:px-8">
      <div className="max-w-4xl mx-auto glass-strong rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl">
        <h1 className="text-4xl font-bold mb-4 text-primary uppercase tracking-tighter">Política de Privacidade</h1>
        <p className="text-xs text-muted-foreground mb-12 uppercase tracking-widest">Última atualização: {lastUpdated}</p>
        
        <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-8 leading-relaxed">
          <section className="bg-white/5 p-6 rounded-2xl border border-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Introdução e Compromisso com a LGPD</h2>
            <p>
              O <strong>DashCompass</strong> (operado por The Fcking Company LLC) está totalmente comprometido com a proteção de seus dados pessoais em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</strong> do Brasil e padrões internacionais de privacidade. Esta política detalha como coletamos, processamos e protegemos suas informações ao utilizar nosso software SaaS.
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

          <section className="border-l-4 border-primary pl-6 py-2">
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Integrações de Terceiros e Verificação</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.1. Google Services (Ads, Search Console, GA4)</h3>
                <p>
                  O uso das informações recebidas das APIs do Google obedecerá à <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Política de Dados do Usuário dos Serviços de API do Google</a>. 
                  Acessamos seus dados exclusivamente para exibição em seu painel privado. Não armazenamos seus dados brutos de marketing em nossos servidores de forma permanente, agindo apenas como uma camada de visualização em tempo real.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.2. LinkedIn, Facebook e TikTok Ads</h3>
                <p>
                  Para conexões com LinkedIn Marketing API, Meta (Facebook/Instagram) Ads API e TikTok For Business API:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Os tokens de acesso são criptografados e armazenados em ambiente seguro.</li>
                  <li>Os dados são utilizados apenas para gerar relatórios de performance solicitados pelo usuário.</li>
                  <li>Não compartilhamos dados entre diferentes contas de clientes (multi-tenant isolation).</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Direitos do Titular (LGPD)</h2>
            <p>Em conformidade com a LGPD, garantimos a você o direito de:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Confirmação da existência de tratamento de dados.</li>
              <li>Acesso, correção e anonimização de dados incompletos ou inexatos.</li>
              <li>Eliminação de dados pessoais tratados com o consentimento do titular.</li>
              <li>Portabilidade dos dados a outro fornecedor de serviço.</li>
              <li>Informação sobre o compartilhamento de dados com entidades públicas e privadas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Retenção e Exclusão</h2>
            <p>
              Mantemos seus dados pessoais apenas pelo tempo necessário para cumprir as finalidades descritas. Ao encerrar sua conta DashCompass, todos os tokens de conexão com APIs externas são revogados e deletados permanentemente de nossa base de dados em até 30 dias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Segurança da Informação</h2>
            <p>
              Utilizamos criptografia de ponta (AES-256) para armazenamento de credenciais sensíveis e protocolos TLS para toda transmissão de dados. Nossos servidores são protegidos por firewalls avançados e monitoramento 24/7.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Contato e DPO</h2>
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
