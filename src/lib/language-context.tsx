"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';

type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    // Header
    'app.title': 'ICE Sighting Tracker',
    'nav.report': 'Report Sighting',
    
    // Alerts
    'alert.title': '⚠️ ICE ALERT',
    'alert.warning': 'WARNING: ICE Sighting reported near you!',
    'alert.details': 'See details at melttheice.us',
    
    // Sidebar
    'sidebar.recent': 'Recent Sightings',
    'sidebar.all': 'All Sightings',
    'sidebar.settings': 'Settings',
    'sidebar.details': 'Sighting Details',
    'sidebar.nodata': 'No recent sightings in the past 4 hours',
    'sidebar.sort': 'Sort sightings',
    'sidebar.sort.trusted': 'Top rated',
    'sidebar.sort.newest': 'Newest',
    'sidebar.sort.nearest': 'Nearest',
    'sidebar.sort.fresh': 'Freshest',
    'sidebar.search.placeholder': 'Search reports — vehicle, color, activity…',
    'sidebar.search.results': 'matching reports',
    'sidebar.search.noresults': 'No reports match your search',
    'sidebar.nearby.closest': 'Closest report',
    'sidebar.nearby.within5km': 'within 5 km',
    'sidebar.summary.reports': 'reports in the last 4 hours',
    'sidebar.summary.stillthere': 'still-there confirmations',
    'sidebar.summary.contested': 'contested',
    'sidebar.summary.busiest': 'busiest hour',
    'sidebar.summary.updates': 'follow-up updates',
    'sidebar.summary.personnel': 'personnel reported',
    'sidebar.summary.areas': 'areas covered',
    'sidebar.summary.complete': 'reports with full details',
    'sidebar.summary.trend': 'trend',
    'sidebar.summary.trend.rising': 'rising',
    'sidebar.summary.trend.falling': 'falling',
    'sidebar.summary.trend.steady': 'steady',
    'sidebar.summary.trend.new': 'new activity',
    'sidebar.export.csv': 'Export CSV',
    'sidebar.export.json': 'Export JSON',
    'sidebar.sort.locationerror': 'Location unavailable — showing newest first',
    'sidebar.similarreports': 'similar reports grouped',
    
    // Urgency Levels
    'urgency.high': 'ACTIVE THREAT',
    'urgency.medium': 'CAUTION',
    'urgency.low': 'ADVISORY',
    
    // Sighting Detail Labels
    'detail.photo': 'Photo Evidence',
    'detail.evidence': 'Sighting evidence',
    'detail.reported': 'Reported',
    'detail.type': 'Type',
    'detail.color': 'Color',
    'detail.count': 'Count',
    'detail.description': 'Description',
    'detail.status': 'Status',
    'detail.coordinates': 'Coordinates',
    
    // Sighting Info
    'sighting.time': 'Time',
    'sighting.vehicle': 'Vehicle',
    'sighting.personnel': 'Personnel',
    'sighting.activity': 'Activity',
    'sighting.location': 'Location',
    'sighting.trust': 'Trust Score',
    'sighting.votes': 'votes',
    'sighting.ago': 'ago',
    'sighting.just': 'Just now',
    
    // Actions
    'action.upvote': 'Upvote',
    'action.downvote': 'Downvote',
    'action.back': 'Back',
    'action.signout': 'Sign Out',
    'action.signin': 'Sign In',
    'action.close': 'Close',
    'action.submit': 'Submit',
    'action.cancel': 'Cancel',
    
    // Settings
    'settings.account': 'Account',
    'settings.notifications': 'Real-time Alerts',
    'settings.notifications.desc': 'Get notified of nearby ICE activity',
    'settings.accessibility': 'Accessibility',
    'settings.colorblind': 'Color Blindness Mode',
    'settings.colorblind.normal': 'Normal',
    'settings.colorblind.protanopia': 'Protanopia (Red-Blind)',
    'settings.colorblind.deuteranopia': 'Deuteranopia (Green-Blind)',
    'settings.colorblind.tritanopia': 'Tritanopia (Blue-Blind)',
    'settings.textsize': 'Text Size',
    'settings.textsize.small': 'Small',
    'settings.textsize.medium': 'Medium',
    'settings.textsize.large': 'Large',
    'settings.phone': 'Phone Number',
    'settings.code': 'Verification Code',
    'settings.sendcode': 'Send Code',
    'settings.verify': 'Verify',
    'settings.signedin': 'Signed in as',
    
    // Report Form
    'report.title': 'Report ICE Sighting',
    'report.vehicle.type': 'Vehicle Type',
    'report.vehicle.color': 'Vehicle Color',
    'report.personnel.count': 'Number of Personnel',
    'report.personnel.desc': 'Personnel Description',
    'report.personnel.desc.placeholder': 'Describe what personnel looked like...',
    'report.activity': 'Activity',
    'report.location': 'Location',
    'report.location.use': 'Use Current Location',
    'report.location.manual': 'Or Enter Address',
    'report.location.address': 'Street Address',
    'report.evidence': 'Photo Evidence (Optional)',
    'report.upload': 'Upload Photo',
    'report.submit': 'Submit Report',
    'report.submitting': 'Submitting...',
    
    // Vehicle Types
    'vehicle.sedan': 'Sedan',
    'vehicle.suv': 'SUV',
    'vehicle.van': 'Van',
    'vehicle.truck': 'Truck',
    'vehicle.bus': 'Bus',
    
    // Colors
    'color.white': 'White',
    'color.black': 'Black',
    'color.gray': 'Gray',
    'color.blue': 'Blue',
    'color.green': 'Green',
    'color.red': 'Red',
    
    // Activities
    'activity.patrol': 'Patrolling',
    'activity.raid': 'Raid',
    'activity.checkpoint': 'Checkpoint',
    'activity.surveillance': 'Surveillance',
    'activity.arrest': 'Arrest',
    
    // Messages
    'msg.loading': 'Loading...',
    'msg.nosightings': 'No recent sightings',
    'msg.error': 'An error occurred',
    'msg.success': 'Success',
    'msg.submitted': 'Report submitted successfully',
  },
  es: {
    // Header
    'app.title': 'Rastreador de Avistamientos de ICE',
    'nav.report': 'Reportar Avistamiento',
    
    // Alerts
    'alert.title': '⚠️ ALERTA DE ICE',
    'alert.warning': 'ADVERTENCIA: ¡Avistamiento de ICE reportado cerca de ti!',
    'alert.details': 'Ver detalles en melttheice.us',
    
    // Sidebar
    'sidebar.recent': 'Avistamientos Recientes',
    'sidebar.all': 'Todos los Avistamientos',
    'sidebar.settings': 'Configuración',
    'sidebar.details': 'Detalles del Avistamiento',
    'sidebar.nodata': 'No hay avistamientos recientes en las últimas 4 horas',
    'sidebar.sort': 'Ordenar avistamientos',
    'sidebar.sort.trusted': 'Mejor valorados',
    'sidebar.sort.newest': 'Más recientes',
    'sidebar.sort.nearest': 'Más cercanos',
    'sidebar.sort.fresh': 'Más actuales',
    'sidebar.search.placeholder': 'Buscar informes — vehículo, color, actividad…',
    'sidebar.search.results': 'informes coincidentes',
    'sidebar.search.noresults': 'Ningún informe coincide con tu búsqueda',
    'sidebar.nearby.closest': 'Informe más cercano',
    'sidebar.nearby.within5km': 'en un radio de 5 km',
    'sidebar.summary.reports': 'informes en las últimas 4 horas',
    'sidebar.summary.stillthere': 'confirmaciones de que siguen ahí',
    'sidebar.summary.contested': 'en disputa',
    'sidebar.summary.busiest': 'hora de mayor actividad',
    'sidebar.summary.updates': 'actualizaciones de seguimiento',
    'sidebar.summary.personnel': 'personas reportadas',
    'sidebar.summary.areas': 'zonas cubiertas',
    'sidebar.summary.complete': 'informes con todos los datos',
    'sidebar.summary.trend': 'tendencia',
    'sidebar.summary.trend.rising': 'en aumento',
    'sidebar.summary.trend.falling': 'en descenso',
    'sidebar.summary.trend.steady': 'estable',
    'sidebar.summary.trend.new': 'actividad nueva',
    'sidebar.export.csv': 'Exportar CSV',
    'sidebar.export.json': 'Exportar JSON',
    'sidebar.sort.locationerror': 'Ubicación no disponible — mostrando los más recientes primero',
    'sidebar.similarreports': 'informes similares agrupados',
    
    // Urgency Levels
    'urgency.high': 'AMENAZA ACTIVA',
    'urgency.medium': 'PRECAUCIÓN',
    'urgency.low': 'AVISO',
    
    // Sighting Detail Labels
    'detail.photo': 'Evidencia Fotográfica',
    'detail.evidence': 'Evidencia del avistamiento',
    'detail.reported': 'Reportado',
    'detail.type': 'Tipo',
    'detail.color': 'Color',
    'detail.count': 'Cantidad',
    'detail.description': 'Descripción',
    'detail.status': 'Estado',
    'detail.coordinates': 'Coordenadas',
    
    // Sighting Info
    'sighting.time': 'Hora',
    'sighting.vehicle': 'Vehículo',
    'sighting.personnel': 'Personal',
    'sighting.activity': 'Actividad',
    'sighting.location': 'Ubicación',
    'sighting.trust': 'Puntuación de Confianza',
    'sighting.votes': 'votos',
    'sighting.ago': 'hace',
    'sighting.just': 'Ahora mismo',
    
    // Actions
    'action.upvote': 'Votar a Favor',
    'action.downvote': 'Votar en Contra',
    'action.back': 'Atrás',
    'action.signout': 'Cerrar Sesión',
    'action.signin': 'Iniciar Sesión',
    'action.close': 'Cerrar',
    'action.submit': 'Enviar',
    'action.cancel': 'Cancelar',
    
    // Settings
    'settings.account': 'Cuenta',
    'settings.notifications': 'Alertas en Tiempo Real',
    'settings.notifications.desc': 'Recibe notificaciones de actividad de ICE cercana',
    'settings.accessibility': 'Accesibilidad',
    'settings.colorblind': 'Modo de Daltonismo',
    'settings.colorblind.normal': 'Normal',
    'settings.colorblind.protanopia': 'Protanopía (Ciego al Rojo)',
    'settings.colorblind.deuteranopia': 'Deuteranopía (Ciego al Verde)',
    'settings.colorblind.tritanopia': 'Tritanopía (Ciego al Azul)',
    'settings.textsize': 'Tamaño de Texto',
    'settings.textsize.small': 'Pequeño',
    'settings.textsize.medium': 'Mediano',
    'settings.textsize.large': 'Grande',
    'settings.phone': 'Número de Teléfono',
    'settings.code': 'Código de Verificación',
    'settings.sendcode': 'Enviar Código',
    'settings.verify': 'Verificar',
    'settings.signedin': 'Sesión iniciada como',
    
    // Report Form
    'report.title': 'Reportar Avistamiento de ICE',
    'report.vehicle.type': 'Tipo de Vehículo',
    'report.vehicle.color': 'Color del Vehículo',
    'report.personnel.count': 'Número de Personal',
    'report.personnel.desc': 'Descripción del Personal',
    'report.personnel.desc.placeholder': 'Describe cómo se veía el personal...',
    'report.activity': 'Actividad',
    'report.location': 'Ubicación',
    'report.location.use': 'Usar Ubicación Actual',
    'report.location.manual': 'O Ingresar Dirección',
    'report.location.address': 'Dirección de la Calle',
    'report.evidence': 'Evidencia Fotográfica (Opcional)',
    'report.upload': 'Subir Foto',
    'report.submit': 'Enviar Reporte',
    'report.submitting': 'Enviando...',
    
    // Vehicle Types
    'vehicle.sedan': 'Sedán',
    'vehicle.suv': 'SUV',
    'vehicle.van': 'Camioneta',
    'vehicle.truck': 'Camión',
    'vehicle.bus': 'Autobús',
    
    // Colors
    'color.white': 'Blanco',
    'color.black': 'Negro',
    'color.gray': 'Gris',
    'color.blue': 'Azul',
    'color.green': 'Verde',
    'color.red': 'Rojo',
    
    // Activities
    'activity.patrol': 'Patrullando',
    'activity.raid': 'Redada',
    'activity.checkpoint': 'Punto de Control',
    'activity.surveillance': 'Vigilancia',
    'activity.arrest': 'Arresto',
    
    // Messages
    'msg.loading': 'Cargando...',
    'msg.nosightings': 'No hay avistamientos recientes',
    'msg.error': 'Ocurrió un error',
    'msg.success': 'Éxito',
    'msg.submitted': 'Reporte enviado exitosamente',
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Load saved language from localStorage
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'en' || saved === 'es')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    
    // Also save to Firestore if user is authenticated
    const user = auth.currentUser;
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          language: lang,
        });
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    }
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Export translations for use in API routes
export { translations };
