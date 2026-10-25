/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../services/authService';
import { 
  waterQualityService,
  surfaceWaterService,
  rainfallService,
  nurseryService,
  nurseryStockOutService,
  reclamationService,
  wasteB3Service,
  documentService,
  environmentalCostService,
  notificationService,
  solidWasteService,
  capaService,
  complianceMatrixService,
  incidentService,
  regulatoryService
} from '../services/dbService';
import { 
  WastewaterData,
  NurseryStockOut, 
  SurfaceWaterData,
  RainfallData, 
  NurseryData, 
  ReclamationPlan, 
  ReclamationGuarantee, 
  WasteIn, 
  WasteOut, 
  EnvironmentalDocument, 
  ComplianceCalendarEvent, 
  EnvironmentalCost,
  AlertNotification,
  SolidWasteData,
  CapaData,
  ComplianceMatrixData,
  IncidentData,
  RegulatoryWatchData
} from '../types';

export function useFirestoreData(activeTab: string) {
  const { user, profile } = useAuth();
  
  const [wastewater, setWastewater] = useState<WastewaterData[]>([]);
  const [surfaceWater, setSurfaceWater] = useState<SurfaceWaterData[]>([]);
  const [rainfall, setRainfall] = useState<RainfallData[]>([]);
  
  const [nursery, setNursery] = useState<NurseryData[]>([]);
  const [nurseryStockOut, setNurseryStockOut] = useState<NurseryStockOut[]>([]);
  const [reclamationPlans, setReclamationPlans] = useState<ReclamationPlan[]>([]);
  const [reclamationGuarantees, setReclamationGuarantees] = useState<ReclamationGuarantee[]>([]);
  
  const [wasteIn, setWasteIn] = useState<WasteIn[]>([]);
  const [wasteOut, setWasteOut] = useState<WasteOut[]>([]);
  
  const [documents, setDocuments] = useState<EnvironmentalDocument[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<ComplianceCalendarEvent[]>([]);
  
  const [environmentalCosts, setEnvironmentalCosts] = useState<EnvironmentalCost[]>([]);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [solidWaste, setSolidWaste] = useState<SolidWasteData[]>([]);
  const [capaFindings, setCapaFindings] = useState<CapaData[]>([]);
  const [complianceMatrix, setComplianceMatrix] = useState<ComplianceMatrixData[]>([]);
  const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [regulatory, setRegulatory] = useState<RegulatoryWatchData[]>([]);

  // Loading States
  const [isLoadingWastewater, setIsLoadingWastewater] = useState(false);
  const [isLoadingSurfaceWater, setIsLoadingSurfaceWater] = useState(false);
  const [isLoadingRainfall, setIsLoadingRainfall] = useState(false);
  const [isLoadingNursery, setIsLoadingNursery] = useState(false);
  const [isLoadingReclamation, setIsLoadingReclamation] = useState(false);
  const [isLoadingWaste, setIsLoadingWaste] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isLoadingCosts, setIsLoadingCosts] = useState(false);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [isLoadingSolidWaste, setIsLoadingSolidWaste] = useState(false);
  const [isLoadingCapa, setIsLoadingCapa] = useState(false);
  const [isLoadingCompliance, setIsLoadingCompliance] = useState(false);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  const [isLoadingRegulatory, setIsLoadingRegulatory] = useState(false);

  // Persistent subscriptions ref across tab navigation
  const subscriptionsRef = useRef<Map<string, () => void>>(new Map());

  // Cleanup all listeners and reset state on logout
  useEffect(() => {
    if (!user || !profile) {
      subscriptionsRef.current.forEach((unsub) => {
        try { unsub(); } catch {}
      });
      subscriptionsRef.current.clear();

      setWastewater([]); setSurfaceWater([]); setRainfall([]);
      setNursery([]); setNurseryStockOut([]); setReclamationPlans([]); setReclamationGuarantees([]);
      setWasteIn([]); setWasteOut([]);
      setDocuments([]); setCalendarEvents([]);
      setEnvironmentalCosts([]); setAlerts([]); setSolidWaste([]);
      setCapaFindings([]); setComplianceMatrix([]); setIncidents([]); setRegulatory([]);
    }
  }, [user, profile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach((unsub) => {
        try { unsub(); } catch {}
      });
      subscriptionsRef.current.clear();
    };
  }, []);

  // Incremental subscription per activeTab: subscribe ONCE and retain during session
  useEffect(() => {
    if (!user || !profile) return;

    const needsMonitoring = ['dashboard', 'monitoring', 'reports'].includes(activeTab);
    const needsReclamation = ['dashboard', 'reclamation', 'reports'].includes(activeTab);
    const needsWaste = ['dashboard', 'waste', 'reports'].includes(activeTab);
    const needsSolidWaste = ['dashboard', 'solid_waste', 'reports'].includes(activeTab);
    const needsDocuments = ['dashboard', 'documents', 'reports'].includes(activeTab);
    const needsCosts = ['dashboard', 'costs'].includes(activeTab);
    const needsCapa = ['dashboard', 'findings'].includes(activeTab);
    const needsCompliance = ['dashboard', 'compliance_matrix'].includes(activeTab);
    const needsIncidents = ['dashboard', 'incidents', 'executive'].includes(activeTab);
    const needsRegulatory = ['regulatory_watch'].includes(activeTab);

    try {
      if (needsMonitoring && !subscriptionsRef.current.has('monitoring')) {
        setIsLoadingWastewater(true);
        setIsLoadingSurfaceWater(true);
        setIsLoadingRainfall(true);

        const u1 = waterQualityService.subscribe((data) => {
          setWastewater(data); setIsLoadingWastewater(false);
        });
        const u2 = surfaceWaterService.subscribe((data) => {
          setSurfaceWater(data); setIsLoadingSurfaceWater(false);
        });
        const u3 = rainfallService.subscribe((data) => {
          setRainfall(data); setIsLoadingRainfall(false);
        });

        subscriptionsRef.current.set('monitoring', () => { u1(); u2(); u3(); });
      }

      if (needsReclamation && !subscriptionsRef.current.has('reclamation')) {
        setIsLoadingNursery(true);
        setIsLoadingReclamation(true);

        const u1 = nurseryStockOutService.subscribe((data) => {
          setNurseryStockOut(data);
        });
        const u2 = nurseryService.subscribe((data) => {
          setNursery(data); setIsLoadingNursery(false);
        });

        let plansLoaded = false, guaranteesLoaded = false;
        const u3 = reclamationService.subscribeAll(
          (plans) => {
            setReclamationPlans(plans); plansLoaded = true;
            if (plansLoaded && guaranteesLoaded) setIsLoadingReclamation(false);
          },
          (guarantees) => {
            setReclamationGuarantees(guarantees); guaranteesLoaded = true;
            if (plansLoaded && guaranteesLoaded) setIsLoadingReclamation(false);
          }
        );

        subscriptionsRef.current.set('reclamation', () => { u1(); u2(); u3(); });
      }

      if (needsWaste && !subscriptionsRef.current.has('waste')) {
        setIsLoadingWaste(true);
        let inLoaded = false, outLoaded = false;
        const u = wasteB3Service.subscribeAll(
          (win) => {
            setWasteIn(win); inLoaded = true;
            if (inLoaded && outLoaded) setIsLoadingWaste(false);
          },
          (wout) => {
            setWasteOut(wout); outLoaded = true;
            if (inLoaded && outLoaded) setIsLoadingWaste(false);
          }
        );
        subscriptionsRef.current.set('waste', u);
      }

      if (needsDocuments && !subscriptionsRef.current.has('documents')) {
        setIsLoadingDocuments(true);
        let docsLoaded = false, eventsLoaded = false;
        const u = documentService.subscribeAll(
          (docs) => {
            setDocuments(docs); docsLoaded = true;
            if (docsLoaded && eventsLoaded) setIsLoadingDocuments(false);
          },
          (events) => {
            setCalendarEvents(events); eventsLoaded = true;
            if (docsLoaded && eventsLoaded) setIsLoadingDocuments(false);
          }
        );
        subscriptionsRef.current.set('documents', u);
      }

      if (needsCosts && !subscriptionsRef.current.has('costs')) {
        setIsLoadingCosts(true);
        const u = environmentalCostService.subscribe((data) => {
          setEnvironmentalCosts(data); setIsLoadingCosts(false);
        });
        subscriptionsRef.current.set('costs', u);
      }

      if (needsSolidWaste && !subscriptionsRef.current.has('solid_waste')) {
        setIsLoadingSolidWaste(true);
        const u = solidWasteService.subscribe((data) => {
          setSolidWaste(data); setIsLoadingSolidWaste(false);
        });
        subscriptionsRef.current.set('solid_waste', u);
      }

      if (needsCapa && !subscriptionsRef.current.has('capa')) {
        setIsLoadingCapa(true);
        const u = capaService.subscribe((data) => {
          setCapaFindings(data); setIsLoadingCapa(false);
        });
        subscriptionsRef.current.set('capa', u);
      }

      if (needsCompliance && !subscriptionsRef.current.has('compliance')) {
        setIsLoadingCompliance(true);
        const u = complianceMatrixService.subscribe((data) => {
          setComplianceMatrix(data); setIsLoadingCompliance(false);
        });
        subscriptionsRef.current.set('compliance', u);
      }

      if (needsIncidents && !subscriptionsRef.current.has('incidents')) {
        setIsLoadingIncidents(true);
        const u = incidentService.subscribe((data) => {
          setIncidents(data); setIsLoadingIncidents(false);
        });
        subscriptionsRef.current.set('incidents', u);
      }

      if (needsRegulatory && !subscriptionsRef.current.has('regulatory')) {
        setIsLoadingRegulatory(true);
        const u = regulatoryService.subscribe((data) => {
          setRegulatory(data); setIsLoadingRegulatory(false);
        });
        subscriptionsRef.current.set('regulatory', u);
      }
    } catch (error) {
      console.error("Gagal mendaftarkan Firestore listeners di hook:", error);
    }
  }, [user, profile, activeTab]);

  useEffect(() => {
    if (!user || !profile) return;
    setIsLoadingAlerts(true);
    const unsubscribe = notificationService.subscribe((data) => {
      setAlerts(data);
      setIsLoadingAlerts(false);
    });
    return () => unsubscribe();
  }, [user, profile]);

  return {
    wastewater, surfaceWater, rainfall, nursery, nurseryStockOut,
    reclamationPlans, reclamationGuarantees,
    wasteIn, wasteOut, documents, calendarEvents,
    environmentalCosts, alerts, solidWaste, capaFindings, complianceMatrix, incidents, regulatory,
    isLoadingWastewater, isLoadingSurfaceWater, isLoadingRainfall,
    isLoadingNursery, isLoadingReclamation, isLoadingWaste,
    isLoadingDocuments, isLoadingCosts, isLoadingAlerts, isLoadingSolidWaste, isLoadingCapa, isLoadingCompliance, isLoadingIncidents, isLoadingRegulatory
  };
}
