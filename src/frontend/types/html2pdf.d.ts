declare module 'html2pdf.js' {
    interface Html2PdfOptions {
        margin?: number | number[] | [number, number] | [number, number, number, number];
        filename?: string;
        image?: { type?: string; quality?: number };
        html2canvas?: any; // Use 'any' for simplicity, or define more specific types if needed
        jsPDF?: any; // Use 'any' for simplicity
        pagebreak?: { mode?: string | string[]; before?: string | string[]; after?: string | string[]; avoid?: string | string[] };
        enableLinks?: boolean;
    }

    interface Html2Pdf {
        set(options: Html2PdfOptions): Html2Pdf;
        from(element: any): Html2Pdf;
        save(filename?: string): Promise<void>;
        output(type: 'bloburl' | 'datauristring' | 'blob', options?: any): Promise<string | Blob>;
        // Add other methods if you use them, e.g., .toPdf(), .outputPdf(), etc.
    }

    const html2pdf: () => Html2Pdf;
    export = html2pdf;
} 