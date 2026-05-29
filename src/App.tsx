/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  initializeLocalStorage, 
  wastewaterDb, 
  rainfallDb, 
  nurseryDb, 
  reclamationDb, 
  wasteDb, 
  documentsDb, 
  alertsDb, 
  getSyncConfig, 
  getUserProfile,
  addSystemNotification
} from './utils/googleSync';
import { 
  WastewaterData, 
  RainfallData, 
  NurseryData, 
  ReclamationPlan, 
  ReclamationGuarantee, 
  WasteIn, 
  WasteOut, 
  EnvironmentalDocument, 
  ComplianceCalendarEvent, 
  AlertNotification, 
  GoogleSyncConfig 
} from './types';

// Page Views
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import MonitoringView from './components/MonitoringView';
import ReclamationView from './components/ReclamationView';
import WasteB3View from './components/WasteB3View';
import ReportsView from './components/ReportsView';
import DocumentsView from './components/DocumentsView';
import NotificationsView from './components/NotificationsView';
import SettingsModals from './components/SettingsModals';
import AuthView from './components/AuthView';

export default function App() {
  // Authentication status
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Tabs layout
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Modals overlays
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);

  // Real-time state pools
  const [wastewater, setWastewater] = useState<WastewaterData[]>([]);
  const [rainfall, setRainfall] = useState<RainfallData[]>([]);
  const [nursery, setNursery] = useState<NurseryData[]>([]);
  const [reclamationPlans, setReclamationPlans] = useState<ReclamationPlan[]>([]);
  const [reclamationGuarantees, setReclamationGuarantees] = useState<ReclamationGuarantee[]>([]);
  const [wasteIn, setWasteIn] = useState<WasteIn[]>([]);
  const [wasteOut, setWasteOut] = useState<WasteOut[]>([]);
  const [wasteStocks, setWasteStocks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<EnvironmentalDocument[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<ComplianceCalendarEvent[]>([]);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [syncConfig, setSyncConfig] = useState<GoogleSyncConfig>({
    clientId: '', spreadsheetId: '', folderId: '', isAuthenticated: false, syncStatus: 'offline', lastSynced: null
  });
  const [userProfile, setUserProfile] = useState<any>(null);

  // Function to pull/resolve fresh storage state
  const loadFreshDatabaseState = () => {
    initializeLocalStorage();
    
    setWastewater(wastewaterDb.getAll());
    setRainfall(rainfallDb.getAll());
    setNursery(nurseryDb.getAll());
    setReclamationPlans(reclamationDb.getPlans());
    setReclamationGuarantees(reclamationDb.getGuarantees());
    setWasteIn(wasteDb.getIn());
    setWasteOut(wasteDb.getOut());
    setWasteStocks(wasteDb.getStocks());
    setDocuments(documentsDb.getAll());
    setCalendarEvents(documentsDb.getEvents());
    setAlerts(alertsDb.getAll());
    setSyncConfig(getSyncConfig());
    setUserProfile(getUserProfile());
  };

  // Mount listeners
  useEffect(() => {
    loadFreshDatabaseState();

    // Set up listeners for custom synchronization/alerts events
    const handleSyncChange = () => {
      setSyncConfig(getSyncConfig());
      setAlerts(alertsDb.getAll());
    };
    
    const handleAlertsChange = () => {
      setAlerts(alertsDb.getAll());
    };

    const handleUserChange = () => {
      setUserProfile(getUserProfile());
    };

    window.addEventListener('coal_monitor_sync_changed', handleSyncChange);
    window.addEventListener('coal_monitor_alerts_changed', handleAlertsChange);
    window.addEventListener('coal_monitor_user_changed', handleUserChange);

    // Dynamic routing via location hash changes
    const handleHashRouter = () => {
      const hash = window.location.hash.replace('#', '');
      if (['dashboard', 'monitoring', 'reclamation', 'waste', 'reports', 'documents', 'notifications'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashRouter);
    handleHashRouter();

    return () => {
      window.removeEventListener('coal_monitor_sync_changed', handleSyncChange);
      window.removeEventListener('coal_monitor_alerts_changed', handleAlertsChange);
      window.removeEventListener('coal_monitor_user_changed', handleUserChange);
      window.removeEventListener('hashchange', handleHashRouter);
    };
  }, []);

  // Sync back path transitions to address URL router
  const navigationControllerAndHashSetter = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  // MUTATION WORKFLOW WRAPPERS
  const handleAddWastewater = (item: any) => {
    wastewaterDb.add(item);
    loadFreshDatabaseState();
  };
  const handleDeleteWastewater = (id: string) => {
    wastewaterDb.delete(id);
    loadFreshDatabaseState();
  };

  const handleAddRainfall = (item: any) => {
    rainfallDb.add(item);
    loadFreshDatabaseState();
  };
  const handleDeleteRainfall = (id: string) => {
    rainfallDb.delete(id);
    loadFreshDatabaseState();
  };

  const handleAddNursery = (item: any) => {
    nurseryDb.add(item);
    loadFreshDatabaseState();
  };
  const handleDeleteNursery = (id: string) => {
    nurseryDb.delete(id);
    loadFreshDatabaseState();
  };

  const handleAddPlan = (item: any) => {
    reclamationDb.addPlan(item);
    loadFreshDatabaseState();
  };
  const handleDeletePlan = (id: string) => {
    reclamationDb.deletePlan(id);
    loadFreshDatabaseState();
  };

  const handleAddGuarantee = (item: any) => {
    reclamationDb.addGuarantee(item);
    loadFreshDatabaseState();
  };
  const handleDeleteGuarantee = (id: string) => {
    reclamationDb.deleteGuarantee(id);
    loadFreshDatabaseState();
  };

  const handleAddWasteIn = (item: any) => {
    wasteDb.addIn(item);
    loadFreshDatabaseState();
  };
  const handleDeleteWasteIn = (id: string) => {
    wasteDb.deleteIn(id);
    loadFreshDatabaseState();
  };

  const handleAddWasteOut = (item: any) => {
    wasteDb.addOut(item);
    loadFreshDatabaseState();
  };
  const handleDeleteWasteOut = (id: string) => {
    wasteDb.deleteOut(id);
    loadFreshDatabaseState();
  };

  const handleAddDocument = (item: any) => {
    documentsDb.add(item);
    loadFreshDatabaseState();
  };
  const handleDeleteDocument = (id: string) => {
    documentsDb.delete(id);
    loadFreshDatabaseState();
  };

  const handleAddCalendarEvent = (item: any) => {
    documentsDb.addEvent(item);
    loadFreshDatabaseState();
  };
  const handleDeleteCalendarEvent = (id: string) => {
    documentsDb.deleteEvent(id);
    loadFreshDatabaseState();
  };
  const handleUpdateCalendarStatus = (id: string, status: any) => {
    documentsDb.updateEvent(id, { status });
    loadFreshDatabaseState();
  };

  const handleNotificationMarkRead = (id: string) => {
    alertsDb.markAsRead(id);
    loadFreshDatabaseState();
  };
  const handleNotificationMarkAllRead = () => {
    alertsDb.markAllAsRead();
    loadFreshDatabaseState();
  };
  const handleNotificationClearAll = () => {
    alertsDb.clearAll();
    loadFreshDatabaseState();
  };

  // Split-view router render engine
  const renderCurrentView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView 
            wastewater={wastewater}
            rainfall={rainfall}
            nursery={nursery}
            guarantees={reclamationGuarantees}
            wasteStocks={wasteStocks}
            calendar={calendarEvents}
            setCurrentTab={navigationControllerAndHashSetter}
          />
        );
      case 'monitoring':
        return (
          <MonitoringView 
            wastewater={wastewater}
            rainfall={rainfall}
            onAddWastewater={handleAddWastewater}
            onDeleteWastewater={handleDeleteWastewater}
            onAddRainfall={handleAddRainfall}
            onDeleteRainfall={handleDeleteRainfall}
          />
        );
      case 'reclamation':
        return (
          <ReclamationView 
            nursery={nursery}
            plans={reclamationPlans}
            guarantees={reclamationGuarantees}
            onAddNursery={handleAddNursery}
            onDeleteNursery={handleDeleteNursery}
            onAddPlan={handleAddPlan}
            onDeletePlan={handleDeletePlan}
            onAddGuarantee={handleAddGuarantee}
            onDeleteGuarantee={handleDeleteGuarantee}
          />
        );
      case 'waste':
        return (
          <WasteB3View 
            wasteIn={wasteIn}
            wasteOut={wasteOut}
            wasteStocks={wasteStocks}
            onAddIn={handleAddWasteIn}
            onDeleteIn={handleDeleteWasteIn}
            onAddOut={handleAddWasteOut}
            onDeleteOut={handleDeleteWasteOut}
          />
        );
      case 'reports':
        return (
          <ReportsView 
            wastewater={wastewater}
            rainfall={rainfall}
            nursery={nursery}
            plans={reclamationPlans}
            wasteIn={wasteIn}
            wasteOut={wasteOut}
            user={userProfile}
          />
        );
      case 'documents':
        return (
          <DocumentsView 
            documents={documents}
            calendar={calendarEvents}
            onAddDocument={handleAddDocument}
            onDeleteDocument={handleDeleteDocument}
            onAddEvent={handleAddCalendarEvent}
            onDeleteEvent={handleDeleteCalendarEvent}
            onUpdateEventStatus={handleUpdateCalendarStatus}
          />
        );
      case 'notifications':
        return (
          <NotificationsView 
            alerts={alerts}
            onMarkRead={handleNotificationMarkRead}
            onMarkAllRead={handleNotificationMarkAllRead}
            onClearAll={handleNotificationClearAll}
          />
        );
      default:
        return <div className="p-8 text-center">Modul tidak ditemukan.</div>;
    }
  };

  // Login Wall filter
  if (!isAuthenticated) {
    return (
      <AuthView 
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          loadFreshDatabaseState();
        }}
      />
    );
  }

  return (
    <div id="app-workspace-shell" className="min-h-screen bg-[#050811] text-slate-100 flex flex-col md:flex-row font-sans relative overflow-hidden">
      {/* Background ambient glow points for Frosted Glass theme */}
      <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none glow-bubble-1 z-0"></div>
      <div className="absolute bottom-[-150px] left-[-100px] w-[500px] h-[500px] bg-teal-500/5 blur-[150px] rounded-full pointer-events-none glow-bubble-2 z-0"></div>
      
      {/* Collapsible Sidebar */}
      <Sidebar 
        currentTab={activeTab}
        setCurrentTab={navigationControllerAndHashSetter}
        syncConfig={syncConfig}
        user={userProfile}
        setSyncModalOpen={setSyncModalOpen}
      />

      {/* Main viewport frame */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden min-w-0 z-10 relative">
        
        {/* Sticky top headers */}
        <Header 
          syncConfig={syncConfig}
          alerts={alerts}
          user={userProfile}
          setSyncModalOpen={setSyncModalOpen}
          setUserModalOpen={setUserModalOpen}
          onRefresh={loadFreshDatabaseState}
          currentTab={activeTab}
        />

        {/* Scrollable contents flow */}
        <main className="flex-1 p-5 md:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full animate-fade-in pb-20 relative z-10">
          {renderCurrentView()}
        </main>
      </div>

      {/* Database sync overlays & configuration dialogs */}
      <SettingsModals 
        syncModalOpen={syncModalOpen}
        setSyncModalOpen={setSyncModalOpen}
        userModalOpen={userModalOpen}
        setUserModalOpen={setUserModalOpen}
        syncConfig={syncConfig}
        user={userProfile}
        onRefresh={loadFreshDatabaseState}
      />
    </div>
  );
}
