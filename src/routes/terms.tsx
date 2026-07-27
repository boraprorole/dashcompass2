import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — DashCompass" },
      { name: "description", content: "Termos e Condições de Uso do DashCompass - The Fcking Company LLC." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const lastUpdated = "27 de Julho de 2026";

  return (
    <div className="min-h-screen bg-background py-20 px-4 md:px-8">
      <div className="max-w-4xl mx-auto glass-strong rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl">
        <h1 className="text-4xl font-bold mb-4 text-primary uppercase tracking-tighter">Termos de Uso</h1>
        <p className="text-xs text-muted-foreground mb-12 uppercase tracking-widest">Última atualização: {lastUpdated}</p>
        
        <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-8 leading-relaxed">
          <section className="bg-white/5 p-6 rounded-2xl border border-white/5">
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar o <strong>DashCompass</strong>, software SaaS operado por <strong>The Fcking Company LLC</strong>, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concorda com qualquer disposição aqui estabelecida, deve interromper o uso do serviço imediatamente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Objeto do Serviço</h2>
            <p>
              O DashCompass fornece uma plataforma de integração e visualização de dados de marketing (dashboards) que se conecta a APIs de terceiros como Google, Meta, LinkedIn e TikTok. O serviço é destinado a empresas e agências para análise interna de performance publicitária.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Contas e Segurança</h2>
            <p>
              Você é responsável por manter a confidencialidade de suas credenciais de acesso. Qualquer atividade realizada sob sua conta será de sua inteira responsabilidade. Notifique-nos imediatamente sobre qualquer uso não autorizado ou quebra de segurança.
            </p>
          </section>

          <section className="border-l-4 border-primary pl-6 py-2">
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Integrações e APIs de Terceiros</h2>
            <p>
              O funcionamento do DashCompass depende da disponibilidade das APIs de terceiros (Google Ads, Search Console, GA4, LinkedIn Ads, etc.).
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2">
              <li><strong>Conformidade:</strong> Ao conectar suas contas, você declara possuir autorização legal para acessar tais dados.</li>
              <li><strong>Limitação:</strong> Não nos responsabilizamos por interrupções causadas por mudanças unilaterais nas políticas ou infraestruturas dessas plataformas de terceiros.</li>
              <li><strong>Google OAuth:</strong> O uso de dados provenientes do Google segue estritamente a Política de Dados do Usuário dos Serviços de API do Google.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Propriedade Intelectual</h2>
            <p>
              Todo o código-fonte, design, logotipos, arquitetura de software e conteúdo proprietário do DashCompass são propriedade exclusiva da <strong>The Fcking Company LLC</strong>. É proibida qualquer tentativa de engenharia reversa, cópia ou redistribuição sem autorização expressa.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Pagamentos e Cancelamento</h2>
            <p>
              Os planos (Starter, Agency, Agency Pro) são cobrados de forma recorrente. O cancelamento pode ser solicitado a qualquer momento através do painel administrativo, mantendo o acesso até o final do período já pago. Não oferecemos reembolsos proporcionais por períodos de uso parcial.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Limitação de Responsabilidade</h2>
            <p>
              O DashCompass é fornecido "como está". Não garantimos que o serviço será ininterrupto ou livre de erros. Em nenhum caso a The Fcking Company LLC será responsável por danos indiretos, perda de lucros ou perda de dados decorrentes do uso do software.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Modificações dos Termos</h2>
            <p>
              Reservamo-nos o direito de atualizar estes termos periodicamente. Alterações significativas serão notificadas via e-mail ou aviso no dashboard. O uso continuado após tais alterações implica na aceitação automática dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Jurisdição</h2>
            <p>
              Estes termos são regidos pelas leis de Sheridan, Wyoming, EUA, onde a The Fcking Company LLC está sediada, sem prejuízo da aplicação das leis de proteção de dados (LGPD) para usuários em território brasileiro.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <a href="/login" className="text-primary hover:text-primary/80 transition-colors text-sm font-bold uppercase tracking-widest">
            ← Voltar para o Login
          </a>
          <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
            © 2026 The Fcking Company LLC. 30 N Gould st ste N sheridan wy 82801.
          </p>
        </div>
      </div>
    </div>
  );
}
