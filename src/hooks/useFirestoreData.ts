/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../services/authService';
import { 
  waterQualityService,
  surfaceWaterService,
  rainfallService,
  nurseryService,
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

  useEffect(() => {
    if (!user || !profile) {
      setWastewater([]); setSurfaceWater([]); setRainfall([]);
      setNursery([]); setReclamationPlans([]); setReclamationGuarantees([]);
      setWasteIn([]); setWasteOut([]);
      setDocuments([]); setCalendarEvents([]);
      setEnvironmentalCosts([]); setAlerts([]); setSolidWaste([]); setCapaFindings([]); setComplianceMatrix([]); setIncidents([]); setRegulatory([]);
      return;
    }

    const cleanups: (() => void)[] = [];

    const needsMonitoring = ['dashboard', 'monitoring', 'reports', 'esg', 'proper'].includes(activeTab);
    const needsReclamation = ['dashboard', 'reclamation', 'reports', 'esg'].includes(activeTab);
    const needsWaste = ['dashboard', 'waste', 'reports', 'esg', 'proper'].includes(activeTab);
    const needsSolidWaste = ['dashboard', 'solid_waste', 'reports', 'esg'].includes(activeTab);
    const needsDocuments = ['dashboard', 'documents', 'reports'].includes(activeTab);
    const needsCosts = ['dashboard', 'costs', 'esg'].includes(activeTab);
    const needsCapa = ['dashboard', 'findings', 'esg'].includes(activeTab);
    const needsCompliance = ['dashboard', 'compliance_matrix', 'esg'].includes(activeTab);
    const needsIncidents = ['dashboard', 'incidents', 'esg', 'executive'].includes(activeTab);
    const needsRegulatory = ['regulatory_watch', 'esg'].includes(activeTab);
    

    try {
      if (needsMonitoring) {
        setIsLoadingWastewater(true);
        cleanups.push(waterQualityService.subscribe((data) => {
          setWastewater(data); setIsLoadingWastewater(false);
        }));

        setIsLoadingSurfaceWater(true);
        cleanups.push(surfaceWaterService.subscribe((data) => {
          setSurfaceWater(data); setIsLoadingSurfaceWater(false);
        }));

        setIsLoadingRainfall(true);
        cleanups.push(rainfallService.subscribe((data) => {
          setRainfall(data); setIsLoadingRainfall(false);
        }));
      }

      if (needsReclamation) {
        setIsLoadingNursery(true);
        cleanups.push(nurseryService.subscribe((data) => {
          setNursery(data); setIsLoadingNursery(false);
        }));

        setIsLoadingReclamation(true);
        let plansLoaded = false, guaranteesLoaded = false;
        cleanups.push(reclamationService.subscribeAll(
          (plans) => {
            setReclamationPlans(plans); plansLoaded = true;
            if (plansLoaded && guaranteesLoaded) setIsLoadingReclamation(false);
          },
          (guarantees) => {
            setReclamationGuarantees(guarantees); guaranteesLoaded = true;
            if (plansLoaded && guaranteesLoaded) setIsLoadingReclamation(false);
          }
        ));
      }

      if (needsWaste) {
        setIsLoadingWaste(true);
        let inLoaded = false, outLoaded = false;
        cleanups.push(wasteB3Service.subscribeAll(
          (win) => {
            setWasteIn(win); inLoaded = true;
            if (inLoaded && outLoaded) setIsLoadingWaste(false);
          },
          (wout) => {
            setWasteOut(wout); outLoaded = true;
            if (inLoaded && outLoaded) setIsLoadingWaste(false);
          }
        ));
      }

      if (needsDocuments) {
        setIsLoadingDocuments(true);
        let docsLoaded = false, eventsLoaded = false;
        cleanups.push(documentService.subscribeAll(
          (docs) => {
            setDocuments(docs); docsLoaded = true;
            if (docsLoaded && eventsLoaded) setIsLoadingDocuments(false);
          },
          (events) => {
            setCalendarEvents(events); eventsLoaded = true;
            if (docsLoaded && eventsLoaded) setIsLoadingDocuments(false);
          }
        ));
      }

      if (needsCosts) {
        setIsLoadingCosts(true);
        cleanups.push(environmentalCostService.subscribe((data) => {
          setEnvironmentalCosts(data); setIsLoadingCosts(false);
        }));
      }


      if (needsSolidWaste) {
        setIsLoadingSolidWaste(true);
        cleanups.push(solidWasteService.subscribe((data) => {
          setSolidWaste(data); setIsLoadingSolidWaste(false);
        }));
      }
      if (needsCapa) {
        setIsLoadingCapa(true);
        cleanups.push(capaService.subscribe((data) => {
          setCapaFindings(data); setIsLoadingCapa(false);
        }));
      }
      if (needsCompliance) {
        setIsLoadingCompliance(true);
        cleanups.push(complianceMatrixService.subscribe((data) => {
          setComplianceMatrix(data); setIsLoadingCompliance(false);
        }));
      }
      if (needsIncidents) {
        setIsLoadingIncidents(true);
        cleanups.push(incidentService.subscribe((data) => {
          setIncidents(data); setIsLoadingIncidents(false);
        }));
      }
      if (needsRegulatory) {
        setIsLoadingRegulatory(true);
        cleanups.push(regulatoryService.subscribe((data) => {
          setRegulatory(data); setIsLoadingRegulatory(false);
        }));
      }

    } catch (error) {
      console.error("Gagal mendaftarkan Firestore listeners di hook:", error);
    }

    return () => {
      cleanups.forEach((unsubscribe) => {
        try { unsubscribe(); } catch (err) {}
      });
    };
  }, [user, profile, activeTab]); // Re-subscribe when activeTab changes

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
    wastewater, surfaceWater, rainfall, nursery,
    reclamationPlans, reclamationGuarantees,
    wasteIn, wasteOut, documents, calendarEvents,
    environmentalCosts, alerts, solidWaste, capaFindings, complianceMatrix, incidents, regulatory,
    isLoadingWastewater, isLoadingSurfaceWater, isLoadingRainfall,
    isLoadingNursery, isLoadingReclamation, isLoadingWaste,
    isLoadingDocuments, isLoadingCosts, isLoadingAlerts, isLoadingSolidWaste, isLoadingCapa, isLoadingCompliance, isLoadingIncidents, isLoadingRegulatory
  };
}
