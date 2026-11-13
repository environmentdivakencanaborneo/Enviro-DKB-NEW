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
  regulatoryService,
  amdTreatmentService,
  airEmissionService,
  topsoilErosionService,
  biodiversityService,
  iadlRiskService,
  properRkabService,
  standardsService,
  internalThresholdsService,
  properCriteriaService,
  pertekSloService,
  reportingCalendarService,
  externalSupervisionService,
  domesticWastewaterService,
  ghgFactorService,
  ghgActivityService,
  forestryPpkhService
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
  RegulatoryWatchData,
  AmdTreatmentData,
  AirEmissionData,
  TopsoilErosionData,
  BiodiversityData,
  IadlRiskData,
  ProperRkabData,
  EnvironmentalStandard,
  InternalThresholdsConfig,
  ProperCriteriaMaster,
  PertekSloData,
  ReportingCalendarData,
  ExternalSupervisionData,
  DomesticWastewaterData,
  GhgEmissionFactorData,
  GhgActivityData,
  ForestryPpkhData
} from '../types';
import { DEFAULT_INTERNAL_THRESHOLDS, DEFAULT_PROPER_CRITERIA } from '../data/regulations';

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
  const [amdTreatments, setAmdTreatments] = useState<AmdTreatmentData[]>([]);
  const [airEmissions, setAirEmissions] = useState<AirEmissionData[]>([]);
  const [topsoilErosions, setTopsoilErosions] = useState<TopsoilErosionData[]>([]);
  const [biodiversity, setBiodiversity] = useState<BiodiversityData[]>([]);
  const [iadlRisks, setIadlRisks] = useState<IadlRiskData[]>([]);
  const [properRkab, setProperRkab] = useState<ProperRkabData[]>([]);
  const [standards, setStandards] = useState<EnvironmentalStandard[]>([]);
  const [internalThresholds, setInternalThresholds] = useState<InternalThresholdsConfig>({ ...DEFAULT_INTERNAL_THRESHOLDS });
  const [properCriteria, setProperCriteria] = useState<ProperCriteriaMaster>({ ...DEFAULT_PROPER_CRITERIA });

  // FASE 3 Collections State
  const [pertekSlo, setPertekSlo] = useState<PertekSloData[]>([]);
  const [reportingCalendar, setReportingCalendar] = useState<ReportingCalendarData[]>([]);
  const [externalSupervisions, setExternalSupervisions] = useState<ExternalSupervisionData[]>([]);
  const [domesticWastewater, setDomesticWastewater] = useState<DomesticWastewaterData[]>([]);
  const [ghgFactors, setGhgFactors] = useState<GhgEmissionFactorData[]>([]);
  const [ghgActivities, setGhgActivities] = useState<GhgActivityData[]>([]);
  const [forestryPpkh, setForestryPpkh] = useState<ForestryPpkhData[]>([]);

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
  const [isLoadingAmd, setIsLoadingAmd] = useState(false);
  const [isLoadingAirEmission, setIsLoadingAirEmission] = useState(false);
  const [isLoadingTopsoil, setIsLoadingTopsoil] = useState(false);
  const [isLoadingBiodiversity, setIsLoadingBiodiversity] = useState(false);
  const [isLoadingIadl, setIsLoadingIadl] = useState(false);
  const [isLoadingProperRkab, setIsLoadingProperRkab] = useState(false);
  const [isLoadingPertekSlo, setIsLoadingPertekSlo] = useState(false);
  const [isLoadingReportingCalendar, setIsLoadingReportingCalendar] = useState(false);
  const [isLoadingSupervisions, setIsLoadingSupervisions] = useState(false);
  const [isLoadingDomesticWastewater, setIsLoadingDomesticWastewater] = useState(false);
  const [isLoadingGhgInventory, setIsLoadingGhgInventory] = useState(false);
  const [isLoadingForestryPpkh, setIsLoadingForestryPpkh] = useState(false);

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
      setAmdTreatments([]); setAirEmissions([]); setTopsoilErosions([]);
      setBiodiversity([]); setIadlRisks([]); setProperRkab([]);
      setStandards([]);
      setInternalThresholds({ ...DEFAULT_INTERNAL_THRESHOLDS });
      setProperCriteria({ ...DEFAULT_PROPER_CRITERIA });
      setPertekSlo([]); setReportingCalendar([]); setExternalSupervisions([]);
      setDomesticWastewater([]); setGhgFactors([]); setGhgActivities([]); setForestryPpkh([]);
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

    const needsMonitoring = ['dashboard', 'monitoring', 'reports', 'evidence'].includes(activeTab);
    const needsReclamation = ['dashboard', 'reclamation', 'reclamation_guarantee', 'reports', 'executive'].includes(activeTab);
    const needsWaste = ['dashboard', 'waste', 'reports'].includes(activeTab);
    const needsSolidWaste = ['dashboard', 'solid_waste', 'reports'].includes(activeTab);
    const needsDocuments = ['dashboard', 'documents', 'reports', 'executive'].includes(activeTab);
    const needsCosts = ['dashboard', 'costs', 'reports'].includes(activeTab);
    const needsCapa = ['dashboard', 'findings', 'supervision', 'reports', 'executive'].includes(activeTab);
    const needsCompliance = ['dashboard', 'compliance_matrix', 'reports', 'executive'].includes(activeTab);
    const needsIncidents = ['dashboard', 'incidents', 'reports', 'executive'].includes(activeTab);
    const needsRegulatory = ['dashboard', 'regulatory_watch', 'reports', 'executive'].includes(activeTab);
    const needsAmd = ['dashboard', 'amd_treatment', 'monitoring', 'reports'].includes(activeTab);
    const needsAirEmission = ['dashboard', 'air_emission', 'reports'].includes(activeTab);
    const needsTopsoil = ['dashboard', 'topsoil_erosion', 'reclamation', 'reports'].includes(activeTab);
    const needsBiodiversity = ['dashboard', 'biodiversity', 'reports'].includes(activeTab);
    const needsIadl = ['dashboard', 'iadl_risk', 'reports', 'executive'].includes(activeTab);
    const needsProperRkab = ['dashboard', 'proper_rkab', 'reports', 'executive'].includes(activeTab);
    const needsStandards = ['dashboard', 'monitoring', 'domestic_wastewater', 'standards_master', 'solid_waste', 'reports', 'evidence', 'executive'].includes(activeTab);
    const needsPertekSlo = ['dashboard', 'pertek_slo', 'reports', 'executive'].includes(activeTab);
    const needsReportingCalendar = ['dashboard', 'reporting_calendar', 'reports', 'executive'].includes(activeTab);
    const needsSupervisions = ['dashboard', 'supervision', 'reports', 'executive'].includes(activeTab);
    const needsDomesticWastewater = ['dashboard', 'domestic_wastewater', 'reports'].includes(activeTab);
    const needsGhgInventory = ['dashboard', 'ghg_inventory', 'reports', 'executive'].includes(activeTab);
    const needsForestryPpkh = ['dashboard', 'forestry_ppkh', 'reports', 'executive'].includes(activeTab);

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

      if (needsAmd && !subscriptionsRef.current.has('amd_treatment')) {
        setIsLoadingAmd(true);
        const u = amdTreatmentService.subscribe((data) => {
          setAmdTreatments(data); setIsLoadingAmd(false);
        });
        subscriptionsRef.current.set('amd_treatment', u);
      }

      if (needsAirEmission && !subscriptionsRef.current.has('air_emission')) {
        setIsLoadingAirEmission(true);
        const u = airEmissionService.subscribe((data) => {
          setAirEmissions(data); setIsLoadingAirEmission(false);
        });
        subscriptionsRef.current.set('air_emission', u);
      }

      if (needsTopsoil && !subscriptionsRef.current.has('topsoil_erosion')) {
        setIsLoadingTopsoil(true);
        const u = topsoilErosionService.subscribe((data) => {
          setTopsoilErosions(data); setIsLoadingTopsoil(false);
        });
        subscriptionsRef.current.set('topsoil_erosion', u);
      }

      if (needsBiodiversity && !subscriptionsRef.current.has('biodiversity')) {
        setIsLoadingBiodiversity(true);
        const u = biodiversityService.subscribe((data) => {
          setBiodiversity(data); setIsLoadingBiodiversity(false);
        });
        subscriptionsRef.current.set('biodiversity', u);
      }

      if (needsIadl && !subscriptionsRef.current.has('iadl_risk')) {
        setIsLoadingIadl(true);
        const u = iadlRiskService.subscribe((data) => {
          setIadlRisks(data); setIsLoadingIadl(false);
        });
        subscriptionsRef.current.set('iadl_risk', u);
      }

      if (needsProperRkab && !subscriptionsRef.current.has('proper_rkab')) {
        setIsLoadingProperRkab(true);
        const u1 = properRkabService.subscribe((data) => {
          setProperRkab(data); setIsLoadingProperRkab(false);
        });
        const u2 = properCriteriaService.subscribe((master) => {
          setProperCriteria(master);
        });
        subscriptionsRef.current.set('proper_rkab', () => { u1(); u2(); });
      }

      if (needsStandards && !subscriptionsRef.current.has('standards')) {
        const u1 = standardsService.subscribe((data) => {
          setStandards(data);
        });
        const u2 = internalThresholdsService.subscribe((cfg) => {
          setInternalThresholds(cfg);
        });
        subscriptionsRef.current.set('standards', () => { u1(); u2(); });
      }

      if (needsPertekSlo && !subscriptionsRef.current.has('pertek_slo')) {
        setIsLoadingPertekSlo(true);
        const u = pertekSloService.subscribe((data) => {
          setPertekSlo(data); setIsLoadingPertekSlo(false);
        });
        subscriptionsRef.current.set('pertek_slo', u);
      }

      if (needsReportingCalendar && !subscriptionsRef.current.has('reporting_calendar')) {
        setIsLoadingReportingCalendar(true);
        const u = reportingCalendarService.subscribe((data) => {
          setReportingCalendar(data); setIsLoadingReportingCalendar(false);
        });
        subscriptionsRef.current.set('reporting_calendar', u);
      }

      if (needsSupervisions && !subscriptionsRef.current.has('external_supervisions')) {
        setIsLoadingSupervisions(true);
        const u = externalSupervisionService.subscribe((data) => {
          setExternalSupervisions(data); setIsLoadingSupervisions(false);
        });
        subscriptionsRef.current.set('external_supervisions', u);
      }

      if (needsDomesticWastewater && !subscriptionsRef.current.has('domestic_wastewater')) {
        setIsLoadingDomesticWastewater(true);
        const u = domesticWastewaterService.subscribe((data) => {
          setDomesticWastewater(data); setIsLoadingDomesticWastewater(false);
        });
        subscriptionsRef.current.set('domestic_wastewater', u);
      }

      if (needsGhgInventory && !subscriptionsRef.current.has('ghg_inventory')) {
        setIsLoadingGhgInventory(true);
        let fLoaded = false, aLoaded = false;
        const u1 = ghgFactorService.subscribe((data) => {
          setGhgFactors(data); fLoaded = true;
          if (fLoaded && aLoaded) setIsLoadingGhgInventory(false);
        });
        const u2 = ghgActivityService.subscribe((data) => {
          setGhgActivities(data); aLoaded = true;
          if (fLoaded && aLoaded) setIsLoadingGhgInventory(false);
        });
        subscriptionsRef.current.set('ghg_inventory', () => { u1(); u2(); });
      }

      if (needsForestryPpkh && !subscriptionsRef.current.has('forestry_ppkh')) {
        setIsLoadingForestryPpkh(true);
        const u = forestryPpkhService.subscribe((data) => {
          setForestryPpkh(data); setIsLoadingForestryPpkh(false);
        });
        subscriptionsRef.current.set('forestry_ppkh', u);
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
    amdTreatments, airEmissions, topsoilErosions, biodiversity, iadlRisks, properRkab,
    standards, internalThresholds, properCriteria,
    pertekSlo, reportingCalendar, externalSupervisions, domesticWastewater, ghgFactors, ghgActivities, forestryPpkh,
    isLoadingWastewater, isLoadingSurfaceWater, isLoadingRainfall,
    isLoadingNursery, isLoadingReclamation, isLoadingWaste,
    isLoadingDocuments, isLoadingCosts, isLoadingAlerts, isLoadingSolidWaste, isLoadingCapa, isLoadingCompliance, isLoadingIncidents, isLoadingRegulatory,
    isLoadingAmd, isLoadingAirEmission, isLoadingTopsoil, isLoadingBiodiversity, isLoadingIadl, isLoadingProperRkab,
    isLoadingPertekSlo, isLoadingReportingCalendar, isLoadingSupervisions, isLoadingDomesticWastewater, isLoadingGhgInventory, isLoadingForestryPpkh
  };
}
