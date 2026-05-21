export default function Membros() {
  return (
    <section className="page">
      <div className="page-title">
        <h2>Membros</h2>
        <p>Área informativa sobre membros no Lunar Conferência Wattpad.</p>
      </div>

      <div className="card warning-card">
        <h3>Página informativa</h3>

        <p>
          Esta versão do sistema não depende de cadastro manual de membros.
          O leitor é identificado diretamente pela ficha colada na página de
          Conferência.
        </p>
      </div>

      <div className="card">
        <h3>Como o membro é identificado</h3>

        <div className="conference-summary-grid">
          <div>
            <span>Nome</span>
            <strong>Lido da ficha</strong>
          </div>

          <div>
            <span>User do Wattpad</span>
            <strong>Lido da ficha</strong>
          </div>

          <div>
            <span>Sub</span>
            <strong>Lido da ficha</strong>
          </div>

          <div>
            <span>Dia</span>
            <strong>Selecionado manualmente</strong>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Por que não cadastrar membros agora?</h3>

        <div className="warning-list">
          <p>
            Como a conferência depende da ficha preenchida e do user usado no
            Wattpad, o cadastro manual de membros poderia criar duplicidade ou
            conflito de nomes.
          </p>

          <p>
            Nesta fase, o sistema usa nome + user + sub + dia + semana para
            organizar o histórico e bloquear duplicidades.
          </p>
        </div>
      </div>
    </section>
  );
}