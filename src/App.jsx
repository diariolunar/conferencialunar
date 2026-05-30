import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Autores from "./pages/Autores.jsx";
import Obras from "./pages/Obras.jsx";
import ObraDetalhes from "./pages/ObraDetalhes.jsx";
import Subs from "./pages/Subs.jsx";
import SubDetalhes from "./pages/SubDetalhes.jsx";
import Regras from "./pages/Regras.jsx";
import Conferencia from "./pages/Conferencia.jsx";
import Historico from "./pages/Historico.jsx";
import Configuracoes from "./pages/Configuracoes.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/conferencia" element={<Conferencia />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/autores" element={<Autores />} />
          <Route path="/obras" element={<Obras />} />
          <Route path="/obras/:obraId" element={<ObraDetalhes />} />
          <Route path="/subs" element={<Subs />} />
          <Route path="/subs/:subId" element={<SubDetalhes />} />
          <Route path="/regras" element={<Regras />} />
          <Route path="/configuracoes" element={<Configuracoes />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}