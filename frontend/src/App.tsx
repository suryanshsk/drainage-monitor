import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import OverviewPage from "@/pages/OverviewPage";
import LiveMonitoringPage from "@/pages/LiveMonitoringPage";
import DrainageMapPage from "@/pages/DrainageMapPage";
import NodesPage from "@/pages/NodesPage";
import NodeDetailPage from "@/pages/NodeDetailPage";
import AlertsPage from "@/pages/AlertsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import PredictionsPage from "@/pages/PredictionsPage";
import NetworkPage from "@/pages/NetworkPage";
import MaintenancePage from "@/pages/MaintenancePage";
import SettingsPage from "@/pages/SettingsPage";
import TrackingPage from "@/pages/TrackingPage";
import IncidentDetailPage from "@/pages/IncidentDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<OverviewPage />} />
        <Route path="/live" element={<LiveMonitoringPage />} />
        <Route path="/map" element={<DrainageMapPage />} />
        <Route path="/nodes" element={<NodesPage />} />
        <Route path="/nodes/:nodeId" element={<NodeDetailPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/predictions" element={<PredictionsPage />} />
        <Route path="/network" element={<NetworkPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/tracking" element={<TrackingPage />} />
        <Route path="/tracking/:incidentId" element={<IncidentDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
