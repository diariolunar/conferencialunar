export default function FeedbackModal({
  mensagem,
  titulo = "Aviso",
  carregando = false,
  onClose
}) {
  if (!mensagem) return null;

  return (
    <div className="modal-backdrop feedback-modal-backdrop" role="presentation">
      <div
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
          <div className="feedback-modal-status">
            <span className="feedback-modal-spinner" aria-hidden="true" />
            <strong>Processando...</strong>
          </div>
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
