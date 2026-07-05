import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";

export default function Layout() {
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  function fecharMenuMobile() {
    setMenuMobileAberto(false);
  }

  useEffect(() => {
    if (!menuMobileAberto) return undefined;

    const overflowAnterior = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function fecharComEsc(evento) {
      if (evento.key === "Escape") {
        fecharMenuMobile();
      }
    }

    window.addEventListener("keydown", fecharComEsc);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", fecharComEsc);
    };
  }, [menuMobileAberto]);

  return (
    <div className="app-layout">
      <button
        type="button"
        className="mobile-menu-button"
        aria-label={menuMobileAberto ? "Fechar menu" : "Abrir menu"}
        aria-controls="sidebar-menu"
        aria-expanded={menuMobileAberto}
        onClick={() => setMenuMobileAberto((aberto) => !aberto)}
      >
        <span />
        <span />
        <span />
      </button>

      <button
        type="button"
        className={`sidebar-backdrop ${menuMobileAberto ? "is-open" : ""}`}
        aria-label="Fechar menu"
        tabIndex={menuMobileAberto ? 0 : -1}
        onClick={fecharMenuMobile}
      />

      <Sidebar
        aberto={menuMobileAberto}
        onClose={fecharMenuMobile}
        onNavigate={fecharMenuMobile}
      />

      <div className="app-content">
        <Header />

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
