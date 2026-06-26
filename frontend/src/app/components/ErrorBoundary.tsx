import * as React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: unknown;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("App crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      const message =
        this.state.error instanceof Error
          ? this.state.error.message
          : "Error inesperado";

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 bg-background">
          <div className="max-w-xl w-full bg-white border border-border rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-foreground mb-2">
              Ha ocurrido un error
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {message}
            </p>
            <div className="text-xs text-muted-foreground">
              Sugerencia: recarga la página. Si el problema persiste, revisa
              logs del backend.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

