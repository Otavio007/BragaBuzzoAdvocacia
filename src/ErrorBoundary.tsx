import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="empty-page" role="alert">
        <h1>Vamos tentar novamente?</h1>
        <p>
          Não foi possível exibir esta tela. Recarregue a página para continuar.
        </p>
        <button
          type="button"
          className="button"
          onClick={() => window.location.reload()}
        >
          Recarregar página
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
