import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — DashCompass" },
      { name: "description", content: "Leia nossos termos de uso e condições." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background py-20 px-4 md:px-8">
      <div className="max-w-3xl mx-auto glass-strong rounded-3xl p-8 md:p-12">
        <h1 className="text-3xl font-bold mb-8 text-primary uppercase tracking-tighter">Termos de Uso</h1>
        <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-6">
          <p>Bem-vindo ao DashCompass. Ao acessar ou usar nosso serviço, você concorda em cumprir e estar vinculado aos seguintes Termos de Uso.</p>
          
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Aceitação dos Termos</h2>
            <p>Ao utilizar o DashCompass, você concorda legalmente com estes termos. Se você não concordar com qualquer parte destes termos, você não deve usar nossos serviços.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Uso do Serviço</h2>
            <p>Você concorda em usar o serviço apenas para fins lícitos e de acordo com as leis aplicáveis. Você é responsável por manter a confidencialidade de sua conta e senha.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Propriedade Intelectual</h2>
            <p>Todo o conteúdo, design e software do DashCompass são de nossa propriedade ou licenciados para nós e são protegidos por leis de propriedade intelectual.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Limitação de Responsabilidade</h2>
            <p>O DashCompass não será responsável por quaisquer danos indiretos, incidentais ou consequentes resultantes do uso ou da incapacidade de usar o serviço.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Alterações nos Termos</h2>
            <p>Reservamo-nos o direito de modificar estes termos a qualquer momento. O uso continuado do serviço após tais alterações constitui sua aceitação dos novos termos.</p>
          </section>
        </div>
        <div className="mt-12 pt-8 border-t border-border">
          <a href="/login" className="text-primary hover:underline text-sm font-semibold uppercase tracking-wider">Voltar para o Login</a>
        </div>
      </div>
    </div>
  );
}
