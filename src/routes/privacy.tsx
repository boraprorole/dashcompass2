import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — DashCompass" },
      { name: "description", content: "Saiba como tratamos seus dados pessoais." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background py-20 px-4 md:px-8">
      <div className="max-w-3xl mx-auto glass-strong rounded-3xl p-8 md:p-12">
        <h1 className="text-3xl font-bold mb-8 text-primary uppercase tracking-tighter">Política de Privacidade</h1>
        <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-6">
          <p>No DashCompass, respeitamos sua privacidade e estamos comprometidos em proteger seus dados pessoais. Esta política descreve como coletamos e usamos suas informações.</p>
          
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Informações que Coletamos</h2>
            <p>Coletamos informações que você nos fornece diretamente, como nome, email e dados de login, além de informações sobre como você utiliza nosso dashboard.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Uso das Informações</h2>
            <p>Usamos suas informações para fornecer, manter e melhorar nossos serviços, além de personalizar sua experiência no painel DashCompass.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Compartilhamento de Dados</h2>
            <p>Não vendemos seus dados pessoais. Podemos compartilhar informações com fornecedores de serviços que nos ajudam a operar nossa plataforma, sempre sob contratos de confidencialidade.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Segurança</h2>
            <p>Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados contra acesso não autorizado ou perda.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Seus Direitos</h2>
            <p>Você tem o direito de acessar, corrigir ou excluir seus dados pessoais a qualquer momento através das configurações de perfil ou entrando em contato conosco.</p>
          </section>
        </div>
        <div className="mt-12 pt-8 border-t border-border">
          <a href="/login" className="text-primary hover:underline text-sm font-semibold uppercase tracking-wider">Voltar para o Login</a>
        </div>
      </div>
    </div>
  );
}
