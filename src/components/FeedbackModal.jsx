import { useEffect, useRef } from "react";

export default function FeedbackModal({
  mensagem,
  titulo = "Aviso",
  carregando = false,
  onCancel = null,
  onClose
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!mensagem) return undefined;

    const elementoAtivo = document.activeElement;

    window.setTimeout(() => {
      const primeiroFocavel = modalRef.current?.querySelector("button");
      primeiroFocavel?.focus();
    }, 0);

    function handleKeyDown(evento) {
      if (evento.key === "Escape") {
        if (carregando && onCancel) {
          onCancel();
        } else if (!carregando) {
          onClose?.();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      elementoAtivo?.focus?.();
    };
  }, [carregando, mensagem, onCancel, onClose]);

  if (!mensagem) return null;

  function handleBackdropClick(evento) {
    if (evento.target !== evento.currentTarget) return;
    if (carregando) return;

    onClose?.();
  }

  return (
    <div
      className="modal-backdrop feedback-modal-backdrop"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="modal-card feedback-modal-card"
        role="alertdialog"
        aria-modal="true"
        aria-busy={carregando}
        aria-labelledby="feedback-modal-title"
        aria-describedby="feedback-modal-message"
      >
        <div className="feedback-modal-header">
          <h3 id="feedback-modal-title">{titulo}</h3>
        </div>

        <p id="feedback-modal-message" className="feedback-modal-message">
          {mensagem}
        </p>

        {carregando ? (
          <>
            <div className="feedback-modal-status">
              <span className="feedback-modal-spinner" aria-hidden="true" />
              <strong>Processando...</strong>
            </div>

            {onCancel && (
              <div className="actions-row feedback-modal-actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={onCancel}
                >
                  Cancelar
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="actions-row feedback-modal-actions">
            <button type="button" className="button-primary" onClick={onClose}>
              Ok
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
