import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Início" },
  { to: "/conferencia", label: "Conferência" },
  { to: "/historico", label: "Histórico" },
  { to: "/autores", label: "Autores" },
  { to: "/membros", label: "Membros" },
  { to: "/obras", label: "Obras" },
  { to: "/subs", label: "Subs" },
  { to: "/regras", label: "Regras" },
  { to: "/configuracoes", label: "Configurações" }
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
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
            <NavLink key={link.to} to={link.to}>
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
