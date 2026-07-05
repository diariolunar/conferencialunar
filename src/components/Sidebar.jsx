import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Início" },
  { to: "/conferencia", label: "Conferência" },
  { to: "/historico", label: "Histórico" },
  { to: "/autores", label: "Autores" },
  { to: "/obras", label: "Obras" },
  { to: "/subs", label: "Subs" },
  { to: "/regras", label: "Regras" },
  { to: "/configuracoes", label: "Configurações" }
];

export default function Sidebar({ aberto = false, onClose, onNavigate }) {
  return (
    <aside
      id="sidebar-menu"
      className={`sidebar ${aberto ? "is-open" : ""}`}
      aria-label="Menu principal"
    >
      <button
        type="button"
        className="sidebar-close-button"
        aria-label="Fechar menu"
        onClick={onClose}
      >
        <span />
        <span />
      </button>

      <div>
        <div className="sidebar-logo">
          <div className="logo-icon">🌙</div>

          <div>
            <strong>Lunar</strong>
            <span>Conferência Wattpad</span>
          </div>
        </div>

        <div className="sidebar-divider" />

        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} onClick={onNavigate}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        <span>Sistema interno</span>
        <strong>Projeto Lunar</strong>
      </div>
    </aside>
  );
}
