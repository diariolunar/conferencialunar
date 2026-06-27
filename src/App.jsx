import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Autores = lazy(() => import("./pages/Autores.jsx"));
const Obras = lazy(() => import("./pages/Obras.jsx"));
const ObraDetalhes = lazy(() => import("./pages/ObraDetalhes.jsx"));
const Subs = lazy(() => import("./pages/Subs.jsx"));
const SubDetalhes = lazy(() => import("./pages/SubDetalhes.jsx"));
const Regras = lazy(() => import("./pages/Regras.jsx"));
const Conferencia = lazy(() => import("./pages/Conferencia.jsx"));
const Historico = lazy(() => import("./pages/Historico.jsx"));
const Configuracoes = lazy(() => import("./pages/Configuracoes.jsx"));
const Membros = lazy(() => import("./pages/Membros.jsx"));

function LoadingPage() {
  return (
    <section className="page">
      <div className="card">
        <div className="empty-state">Carregando...</div>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingPage />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/conferencia" element={<Conferencia />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/autores" element={<Autores />} />
            <Route path="/membros" element={<Membros />} />
            <Route path="/obras" element={<Obras />} />
            <Route path="/obras/:obraId" element={<ObraDetalhes />} />
            <Route path="/subs" element={<Subs />} />
            <Route path="/subs/:subId" element={<SubDetalhes />} />
            <Route path="/regras" element={<Regras />} />
            <Route path="/configuracoes" element={<Configuracoes />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
