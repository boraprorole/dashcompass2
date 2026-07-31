import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

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
  const [lang, setLang] = useState<'pt' | 'en'>('pt');
  const lastUpdated = "31 de Julho de 2026";

  const toggleLang = () => setLang(lang === 'pt' ? 'en' : 'pt');

  return (
    <div className="min-h-screen bg-background py-20 px-4 md:px-8">
      <div className="max-w-4xl mx-auto glass-strong rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold text-primary uppercase tracking-tighter">
              {lang === 'pt' ? 'Política de Privacidade' : 'Privacy Policy'}
            </h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-2">
              {lang === 'pt' ? `Última atualização: ${lastUpdated}` : `Last updated: July 31, 2026`}
            </p>
          </div>
          <button 
            onClick={toggleLang}
            className="px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-lg text-primary font-bold transition-colors text-sm uppercase tracking-wider border border-primary/30"
          >
            {lang === 'pt' ? 'Switch to English' : 'Mudar para Português'}
          </button>
        </div>
        
        <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-8 leading-relaxed">
          {lang === 'pt' ? (
            <>
              <section className="bg-white/5 p-6 rounded-2xl border border-white/5">
                <h2 className="text-xl font-semibold text-foreground mb-4">1. Introdução e Compromisso com a LGPD</h2>
                <p>
                  O <strong>DashCompass</strong> (operado por The Fcking Company LLC) está totalmente comprometido com a proteção de seus dados pessoais em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</strong> do Brasil, o <strong>GDPR</strong> e padrões internacionais de privacidade. Esta política detalha como coletamos, processamos e protegemos suas informações ao utilizar nosso software SaaS.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">2. Coleta de Dados e Armazenamento</h2>
                <p>
                  O DashCompass atua principalmente como uma plataforma de visualização e consolidação de dados. Sempre que possível, os dados são consultados diretamente das APIs do Google em tempo real. Armazenamos apenas as informações necessárias para manter a integração (como tokens OAuth criptografados e configurações da conta) e, quando aplicável, dados temporários de cache para melhorar o desempenho da plataforma.
                </p>
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
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">4. Princípio do Menor Privilégio (Least Privilege)</h2>
                <p>
                  O DashCompass solicita apenas os escopos OAuth estritamente necessários para fornecer as funcionalidades escolhidas pelo usuário. Cada permissão é utilizada exclusivamente para acessar os dados correspondentes às integrações habilitadas, e não solicitamos permissões que não sejam necessárias para o funcionamento dos recursos disponíveis na plataforma.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">5. Inteligência Artificial e Machine Learning</h2>
                <p className="bg-white/5 p-4 rounded-lg border border-white/10 mb-2">
                  Google user data obtained through Google APIs is not used to develop, improve, or train generalized artificial intelligence or machine learning models, nor is it transferred to third-party AI services for those purposes.
                </p>
                <p className="italic">
                  Os dados de usuário do Google obtidos através das APIs do Google não são utilizados para desenvolver, melhorar ou treinar modelos generalizados de inteligência artificial ou aprendizado de máquina, nem são transferidos para serviços de IA de terceiros para esses fins.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">6. Data Sharing (Compartilhamento de Dados)</h2>
                <p>Em relação aos dados obtidos via APIs do Google e outras integrações:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Não Venda:</strong> Os dados do Google NÃO são vendidos para terceiros.</li>
                  <li><strong>Não Publicidade:</strong> NÃO são compartilhados com anunciantes ou utilizados para publicidade personalizada.</li>
                  <li><strong>Não Brokers:</strong> NÃO são compartilhados com data brokers.</li>
                  <li><strong>Restrição:</strong> Os dados só podem ser compartilhados quando exigido por lei ou quando estritamente necessário para operar a plataforma.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">7. Data Security (Segurança de Dados)</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Toda comunicação utiliza HTTPS/TLS.</li>
                  <li>Tokens OAuth são armazenados de forma criptografada (AES-256).</li>
                  <li>Credenciais possuem acesso restrito e servidores possuem monitoramento contínuo.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">8. Data Retention and Deletion (Retenção e Exclusão)</h2>
                <p>
                  Os usuários podem desconectar a Conta Google a qualquer momento. Os tokens OAuth podem ser revogados e a exclusão da conta DashCompass remove permanentemente os tokens em até 30 dias.
                </p>
              </section>

              <section className="bg-primary/10 p-6 rounded-2xl border border-primary/30">
                <h2 className="text-xl font-semibold text-foreground mb-4">9. Google API Services User Data Policy Compliance</h2>
                <div className="bg-background/50 p-4 rounded-lg border border-white/5 font-mono text-xs mb-4">
                  "The use and transfer of information received from Google APIs by DashCompass adheres to the Google API Services User Data Policy, including the Limited Use requirements."
                </div>
                <p className="italic text-xs">
                  O uso e a transferência de informações recebidas das APIs do Google pelo DashCompass obedecem à Política de Dados do Usuário dos Serviços de API do Google, incluindo os requisitos de Uso Limitado.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">10. Contato</h2>
                <p>Dúvidas sobre privacidade: <span className="text-primary font-mono font-bold">legal@dashcompass.com</span></p>
              </section>
            </>
          ) : (
            <>
              <section className="bg-white/5 p-6 rounded-2xl border border-white/5">
                <h2 className="text-xl font-semibold text-foreground mb-4">1. Introduction and Privacy Commitment</h2>
                <p>
                  <strong>DashCompass</strong> (operated by The Fcking Company LLC) is fully committed to protecting your personal data in compliance with <strong>LGPD</strong>, <strong>GDPR</strong>, and international privacy standards.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">2. Data Collection and Storage</h2>
                <p>
                  DashCompass acts primarily as a data visualization and consolidation platform. Whenever possible, data is queried directly from Google APIs in real-time. We only store information necessary to maintain the integration (such as encrypted OAuth tokens and account settings) and, where applicable, temporary cache data to improve platform performance.
                </p>
              </section>

              <section className="bg-primary/5 p-6 rounded-2xl border border-primary/20">
                <h2 className="text-xl font-semibold text-foreground mb-4">3. Google API Data Usage</h2>
                <p>
                  DashCompass accesses Google service data to provide dashboard and reporting features via explicit user OAuth authorization.
                </p>
                <ul className="list-disc pl-5 mt-4 space-y-1">
                  <li><strong>Google Analytics 4:</strong> Properties, traffic, and conversion metrics.</li>
                  <li><strong>Google Search Console:</strong> Search performance, queries, and pages.</li>
                  <li><strong>Google Ads:</strong> Campaigns, ads, and performance metrics.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">4. Least Privilege Principle</h2>
                <p>
                  DashCompass requests only the OAuth scopes strictly necessary to provide the features chosen by the user. Each permission is used exclusively to access data corresponding to enabled integrations, and we do not request permissions that are not necessary for the functioning of the features available on the platform.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">5. Artificial Intelligence and Machine Learning</h2>
                <p className="bg-white/5 p-4 rounded-lg border border-white/10">
                  Google user data obtained through Google APIs is not used to develop, improve, or train generalized artificial intelligence or machine learning models, nor is it transferred to third-party AI services for those purposes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">6. Data Sharing</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>No Sale:</strong> Google data is NOT sold to third parties.</li>
                  <li><strong>No Advertising:</strong> NOT shared with advertisers or used for personalized advertising.</li>
                  <li><strong>No Brokers:</strong> NOT shared with data brokers.</li>
                  <li><strong>Restricted:</strong> Data can only be shared when required by law or necessary for platform operation.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">7. Data Security</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li>All communication uses HTTPS/TLS.</li>
                  <li>OAuth tokens are stored encrypted (AES-256).</li>
                  <li>Credentials have restricted access and servers have continuous monitoring.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">8. Data Retention and Deletion</h2>
                <p>
                  Users can disconnect their Google Account at any time. OAuth tokens can be revoked, and DashCompass account deletion permanently removes tokens within 30 days.
                </p>
              </section>

              <section className="bg-primary/10 p-6 rounded-2xl border border-primary/30">
                <h2 className="text-xl font-semibold text-foreground mb-4">9. Google API Services User Data Policy Compliance</h2>
                <div className="bg-background/50 p-4 rounded-lg border border-white/5 font-mono text-xs mb-4">
                  "The use and transfer of information received from Google APIs by DashCompass adheres to the Google API Services User Data Policy, including the Limited Use requirements."
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">10. Contact</h2>
                <p>Privacy inquiries: <span className="text-primary font-mono font-bold">legal@dashcompass.com</span></p>
              </section>
            </>
          )}
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <a href="/login" className="text-primary hover:text-primary/80 transition-colors text-sm font-bold uppercase tracking-widest">
            {lang === 'pt' ? '← Voltar para o Dashboard' : '← Back to Dashboard'}
          </a>
          <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
            © 2026 The Fcking Company LLC. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
