import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleResetCache = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F7F6] text-[#181C1C] flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 max-w-lg w-full shadow-xl space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">
                Alkalmazáshiba történt
              </h2>
              <p className="text-xs sm:text-sm text-stone-600">
                Az alkalmazás futása közben váratlan hiba lépett fel. Az alábbi gombokkal egyszerűen újraindíthatja a felületet.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-stone-100 rounded-lg text-left font-mono text-[11px] text-red-600 overflow-x-auto border border-stone-200 max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#006067] hover:bg-[#00474c] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Oldal újratöltése</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer border border-stone-200"
              >
                <Trash2 className="w-4 h-4 text-stone-500" />
                <span>Gyorsítótár ürítése</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
