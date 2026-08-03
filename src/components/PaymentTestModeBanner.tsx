const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full bg-destructive/15 border-b border-destructive/40 px-4 py-2 text-center text-sm text-destructive-foreground">
        Os pagamentos de produção ainda não estão configurados neste ambiente.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full bg-primary/15 border-b border-primary/40 px-4 py-2 text-center text-sm text-primary">
        Todos os pagamentos feitos na pré-visualização estão em modo de teste.{" "}
        <a
          href="https://docs.lovable.dev/features/payments#test-and-live-environments"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium"
        >
          Saiba mais
        </a>
      </div>
    );
  }
  return null;
}
