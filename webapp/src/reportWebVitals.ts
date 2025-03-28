type ReportCallback = (metric: { name: string; value: number }) => void;

const reportWebVitals = (onPerfEntry?: ReportCallback): void => {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    // Dynamically import web-vitals for better performance
    import('web-vitals').then((webVitals) => {
      // Use any because web-vitals typings are inconsistent
      const vitals = webVitals as any;
      if (vitals.getCLS) vitals.getCLS(onPerfEntry);
      if (vitals.getFID) vitals.getFID(onPerfEntry);
      if (vitals.getFCP) vitals.getFCP(onPerfEntry);
      if (vitals.getLCP) vitals.getLCP(onPerfEntry);
      if (vitals.getTTFB) vitals.getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals; 