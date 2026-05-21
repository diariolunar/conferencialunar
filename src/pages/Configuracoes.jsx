import { useMemo } from "react";

export default function Configuracoes() {
  const statusSistema = useMemo(() => {
    return {
      frontend: "React + Vite",
      banco: "Firebase Firestore",
      api: "Serverless Vercel",
      comentarios: "Mock ativo no frontend",
      importacaoWattpad: "API experimental",
      deploy: "GitHub conectado ao Vercel"
    };
  }, []);

  return (
    <section className="page">
      <div className="page-title">
        <h2>Configurações</h2>
        <p>Status geral e instruções técnicas do sistema.</p>
      </div>

      <div className="card">
        <h3>Status do sistema</h3>

        <div className="conference-summary-grid">
          <div>
            <span>Frontend</span>
            <strong>{statusSistema.frontend}</strong>
          </div>

          <div>
            <span>Banco de dados</span>
            <strong>{statusSistema.banco}</strong>
          </div>

          <div>
            <span>API</span>
            <strong>{statusSistema.api}</strong>
          </div>

          <div>
            <span>Comentários</span>
            <strong>{statusSistema.comentarios}</strong>
          </div>

          <div>
            <span>Importação Wattpad</span>
            <strong>{statusSistema.importacaoWattpad}</strong>
          </div>

          <div>
            <span>Deploy</span>
            <strong>{statusSistema.deploy}</strong>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Como alternar comentários mock/API real</h3>

        <div className="warning-list">
          <p>
            Atualmente o sistema usa comentários mockados para testar a conferência
            sem depender do Wattpad.
          </p>

          <p>
            Para tentar buscar comentários reais, abra o arquivo:
          </p>

          <p>
            <strong>src/services/comentariosService.js</strong>
          </p>

          <p>
            E troque:
          </p>

          <pre className="code-preview">const USAR_COMENTARIOS_MOCK = true;</pre>

          <p>
            Para:
          </p>

          <pre className="code-preview">const USAR_COMENTARIOS_MOCK = false;</pre>
        </div>
      </div>

      <div className="card">
        <h3>Observação importante</h3>

        <div className="warning-list">
          <p>
            O Wattpad pode bloquear ou ocultar comentários no HTML inicial.
            Por isso, a API real é experimental.
          </p>

          <p>
            O sistema foi estruturado de forma segura: mesmo se a API real falhar,
            a conferência, o histórico, as regras e o banco continuam funcionando.
          </p>
        </div>
      </div>
    </section>
  );
}