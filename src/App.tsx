import React from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { Layout } from "./components/Layout";

import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NpcListPage } from "./pages/NpcListPage";
import { NpcDetailPage } from "./pages/NpcDetailPage";
import { NpcFormPage } from "./pages/NpcFormPage";

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="npcs" element={<NpcListPage />} />
          <Route path="npcs/new" element={<NpcFormPage mode="create" />} />
          <Route path="npcs/:id" element={<NpcDetailPage />} />
          <Route path="npcs/:id/edit" element={<NpcFormPage mode="edit" />} />
        </Route>

        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </HashRouter>
  );
}