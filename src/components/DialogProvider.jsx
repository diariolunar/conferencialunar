import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

const DialogContext = createContext(null);

export function useDialog() {
  const dialog = useContext(DialogContext);

  if (!dialog) {
    throw new Error("useDialog deve ser usado dentro de DialogProvider.");
  }

  return dialog;
}

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const resolverRef = useRef(null);
  const dialogRef = useRef(null);

  const abrirDialogo = useCallback((config) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setInputValue(config.defaultValue || "");
      setDialog(config);
    });
  }, []);

  const finalizarDialogo = useCallback((valor) => {
    const resolver = resolverRef.current;

    resolverRef.current = null;
    setDialog(null);
    setInputValue("");

    if (resolver) {
      resolver(valor);
    }
  }, []);

  const api = useMemo(
    () => ({
      confirm(config) {
        return abrirDialogo({
          type: "confirm",
          title: "Confirmar ação",
          confirmLabel: "Confirmar",
          cancelLabel: "Cancelar",
          ...config
        });
      },

      prompt(config) {
        return abrirDialogo({
          type: "prompt",
          title: "Informe os dados",
          confirmLabel: "Confirmar",
          cancelLabel: "Cancelar",
          placeholder: "",
          required: false,
          ...config
        });
      },

      alert(config) {
        return abrirDialogo({
          type: "alert",
          title: "Aviso",
          confirmLabel: "Ok",
          ...config
        });
      }
    }),
    [abrirDialogo]
  );

  const confirmarDesabilitado =
    dialog?.type === "prompt" && dialog.required && !inputValue.trim();

  function confirmarDialogo(evento) {
    evento?.preventDefault();

    if (confirmarDesabilitado) return;

    if (dialog.type === "prompt") {
      finalizarDialogo(inputValue);
      return;
    }

    if (dialog.type === "alert") {
      finalizarDialogo(true);
      return;
    }

    finalizarDialogo(true);
  }

  function handleBackdropClick(evento) {
    if (evento.target === evento.currentTarget && dialog?.type !== "alert") {
      finalizarDialogo(null);
    }
  }

  useEffect(() => {
    if (!dialog) return undefined;

    const elementoAtivo = document.activeElement;

    window.setTimeout(() => {
      const primeiroFocavel = dialogRef.current?.querySelector(
        "input, button, textarea, select, a[href]"
      );

      primeiroFocavel?.focus();
    }, 0);

    function handleKeyDown(evento) {
      if (evento.key === "Escape" && dialog.type !== "alert") {
        finalizarDialogo(null);
        return;
      }

      if (evento.key !== "Tab") return;

      const focaveis = [
        ...(dialogRef.current?.querySelectorAll(
          "input, button, textarea, select, a[href]"
        ) || [])
      ].filter((item) => !item.disabled);

      if (focaveis.length === 0) return;

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      elementoAtivo?.focus?.();
    };
  }, [dialog, finalizarDialogo]);

  return (
    <DialogContext.Provider value={api}>
      {children}

      {dialog && (
        <div
          className="modal-backdrop dialog-modal-backdrop"
          role="presentation"
          onMouseDown={handleBackdropClick}
        >
          <form
            ref={dialogRef}
            className="modal-card dialog-modal-card"
            role={dialog.type === "alert" ? "alertdialog" : "dialog"}
            aria-modal="true"
            aria-labelledby="dialog-modal-title"
            aria-describedby="dialog-modal-message"
            onSubmit={confirmarDialogo}
          >
            <div className="dialog-modal-header">
              <h3 id="dialog-modal-title">{dialog.title}</h3>
            </div>

            <p id="dialog-modal-message" className="dialog-modal-message">
              {dialog.message}
            </p>

            {dialog.type === "prompt" && (
              <label className="dialog-modal-field">
                {dialog.inputLabel || "Resposta"}
                <input
                  autoFocus
                  type="text"
                  value={inputValue}
                  onChange={(evento) => setInputValue(evento.target.value)}
                  placeholder={dialog.placeholder}
                />
              </label>
            )}

            <div className="actions-row dialog-modal-actions">
              {dialog.type !== "alert" && (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => finalizarDialogo(null)}
                >
                  {dialog.cancelLabel}
                </button>
              )}

              <button
                type="submit"
                className={
                  dialog.variant === "danger" ? "button-danger" : "button-primary"
                }
                disabled={confirmarDesabilitado}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </form>
        </div>
      )}
    </DialogContext.Provider>
  );
}
