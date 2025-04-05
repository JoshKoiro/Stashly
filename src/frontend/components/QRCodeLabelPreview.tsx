import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import QRCodeStyling, { Options as QRCodeStylingOptions, CornerSquareType, CornerDotType, DotType } from 'qr-code-styling';
import html2pdf from 'html2pdf.js';
import { Package } from '../../backend/db/schema'; // Assuming Package type is defined
import './QRCodeLabelPreview.css'; // We will create this CSS file

interface PreviewData {
    packages: Package[];
    copies: number;
    offset: number;
    baseUrl: string;
}

interface LabelInfo extends Package {
    qrInstance?: QRCodeStyling; // To hold the instance for updates/downloads
}

// Sub-component to render a single QR code - helps manage refs
const QRCodeComponent: React.FC<{ options: QRCodeStylingOptions }> = ({ options }) => {
    const ref = useRef<HTMLDivElement>(null);
    const qrInstanceRef = useRef<QRCodeStyling | null>(null);

    useEffect(() => {
        if (ref.current) {
            if (!qrInstanceRef.current) {
                // Create new instance only if it doesn't exist
                qrInstanceRef.current = new QRCodeStyling(options);
                qrInstanceRef.current.append(ref.current);
            } else {
                // Update existing instance if options change (though they shouldn't often here)
                 qrInstanceRef.current.update(options);
            }
        }
        // Cleanup function to remove the QR code when the component unmounts or options change significantly
        return () => {
             if (qrInstanceRef.current && ref.current) {
                 // A proper cleanup might involve clearing the container,
                 // but qr-code-styling doesn't have a dedicated destroy method.
                 // Setting innerHTML to empty is a common way.
                 ref.current.innerHTML = '';
                 qrInstanceRef.current = null; // Release the instance reference
             }
        };
    }, [options]); // Re-run effect if options change

    return <div ref={ref} className="qr-code-container"></div>;
};


export default function QRCodeLabelPreview() {
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [labelsToRender, setLabelsToRender] = useState<LabelInfo[]>([]);
    const [pdfGenerating, setPdfGenerating] = useState(false);

    const labelsContainerRef = useRef<HTMLDivElement>(null);

    const packageIds = searchParams.get('packageIds');
    const copies = searchParams.get('copies') ?? '1';
    const offset = searchParams.get('offset') ?? '0';

    useEffect(() => {
        if (!packageIds) {
            setError("No package IDs provided in the URL.");
            setLoading(false);
            return;
        }

        const fetchPreviewData = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/qr-labels-preview?packageIds=${packageIds}&copies=${copies}&offset=${offset}`);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch preview data.' }));
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                const data: PreviewData = await response.json();
                setPreviewData(data);

                // Prepare labels based on copies
                const allLabels: LabelInfo[] = [];
                data.packages.forEach(pkg => {
                    for (let i = 0; i < data.copies; i++) {
                        allLabels.push({ ...pkg }); // Add a copy of the package
                    }
                });
                setLabelsToRender(allLabels);

            } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchPreviewData();
    }, [packageIds, copies, offset]); // Re-fetch if params change

    const handleCreatePdf = useCallback(() => {
        const originalElement = labelsContainerRef.current;
        if (!originalElement || !previewData) return;

        setPdfGenerating(true);
        setError(null);

        // Introduce a small delay to allow QR codes to render
        setTimeout(() => {
            const currentOriginalElement = labelsContainerRef.current; // Re-access ref inside timeout
            if (!currentOriginalElement || !previewData) {
                setPdfGenerating(false); // Ensure state is reset if element disappears
                return;
            }

            // --- Clone the element --- 
            const clone = currentOriginalElement.cloneNode(true) as HTMLElement;
            
            // Style the clone to be off-screen but renderable
            clone.style.position = 'absolute';
            clone.style.left = '0px';
            clone.style.top = '0px';
            clone.style.zIndex = '-1'; // Ensure it's behind everything
            // Ensure the clone also has the necessary dimensions explicitly set for capture
            clone.style.width = '8.125in'; 
            clone.style.height = '10in';
            clone.style.margin = '0'; // Remove any inherited margin
            clone.style.boxShadow = 'none'; // Remove visual shadow

            // Append clone to body
            document.body.appendChild(clone);
            // --- End Cloning ---

            // --- Render QR Codes directly into the CLONE --- 
            const qrContainersInClone = clone.querySelectorAll('.qr-code-container');
            // Ensure the number of containers matches the number of labels rendered
            if (qrContainersInClone.length === labelsToRender.length) {
                labelsToRender.forEach((label, index) => {
                    const containerDiv = qrContainersInClone[index] as HTMLElement;
                    if (containerDiv) {
                         // Clear any potential old content (like empty divs from original component)
                        containerDiv.innerHTML = ''; 
                        
                        const url = `${previewData.baseUrl}/packages/${label.id}`;
                        const qrOptions: QRCodeStylingOptions = {
                            type: 'svg', // Render as SVG
                            width: 80,
                            height: 80,
                            data: url,
                            margin: 0,
                            qrOptions: { errorCorrectionLevel: 'M' },
                            dotsOptions: { color: "#000080", type: "rounded" as DotType },
                            cornersSquareOptions: { color: "#000080", type: "extra-rounded" as CornerSquareType },
                            cornersDotOptions: { color: "#000080", type: "dot" as CornerDotType },
                            backgroundOptions: { color: "#ffffff" },
                        };
                        const qrInstance = new QRCodeStyling(qrOptions);
                        qrInstance.append(containerDiv);
                    }
                });
            } else {
                 console.error('Mismatch between label data and QR containers in clone.');
                 // Handle error: maybe skip PDF generation or show an error message
                 setError("Failed to prepare QR codes for PDF. Mismatch detected.");
                 document.body.removeChild(clone); // Clean up clone
                 setPdfGenerating(false);
                 return; // Stop PDF generation
            }
            // --- End QR Code Rendering into Clone ---

             // Optional: Add a tiny delay AFTER rendering QR codes into clone, BEFORE capture
            setTimeout(() => {
                const { offset } = previewData; // Access again inside this timeout
                const filename = `qr-labels-offset-${offset}.pdf`;

                const opt = {
                    margin: [0.5, 0.1875, 0.5, 0.1875],
                    filename: filename,
                    image: { type: 'png', quality: 1.0 },
                    html2canvas: {
                        scale: 2,
                        useCORS: true, logging: false,
                    },
                    jsPDF: {
                        unit: 'in', format: 'letter', orientation: 'portrait'
                    },
                    pagebreak: { mode: ['css', 'avoid-all'] },
                };

                // Capture the CLONE
                html2pdf()
                    .set(opt)
                    .from(clone)
                    .output('bloburl')
                    .then((value: string | Blob) => {
                        if (typeof value === 'string') {
                            window.open(value, '_blank');
                        } else {
                            console.error("html2pdf.output('bloburl') returned a Blob, expected a string URL.");
                            setError("Failed to generate PDF URL. Unexpected return type.");
                        }
                    })
                    .catch((err: Error) => {
                        console.error("Error generating PDF:", err);
                        setError(`Failed to generate PDF: ${err.message}`);
                    })
                    .finally(() => {
                        // Clean up: Remove the clone
                        if (document.body.contains(clone)) {
                            document.body.removeChild(clone);
                        }
                        setPdfGenerating(false);
                    });
                 }, 100); // 100ms delay after clone QR render, before capture. Adjust if needed.

        }, 250); // Keep initial delay for original DOM stability before cloning

    }, [previewData, labelsToRender]); // Add labelsToRender dependency

    if (loading) return <div className="loading">Loading label preview...</div>;
    // Display specific error first if it exists
    if (error) return <div className="error">Error: {error} <Link to="/print-qr">Go Back</Link></div>;
    // Handle case where data might be null even if not loading and no specific error (shouldn't happen with current logic)
    if (!previewData) return <div className="error">Could not load preview data. <Link to="/print-qr">Go Back</Link></div>;
    // Handle case where valid packages resulted in zero labels (e.g., copies=0, though backend enforces min 1)
    if (labelsToRender.length === 0) return <div className="info">No labels to display based on selection. <Link to="/print-qr">Go Back</Link></div>;


    // Calculate the number of placeholder cells needed for the offset
    const placeholderCells = Array(previewData.offset % 30).fill(null); // 30 labels per page

    return (
        <div className="qr-label-preview-page">
            <div className="preview-controls">
                 <Link to="/print-qr" className="back-btn">
                    <i className="fas fa-arrow-left"></i> Back to Selection
                 </Link>
                <h1>QR Label Preview</h1>
                <button onClick={handleCreatePdf} disabled={pdfGenerating} className="print-btn">
                    {pdfGenerating ? (
                        <>
                            <i className="fas fa-spinner fa-spin"></i> Generating PDF...
                        </>
                    ) : (
                         <>
                            <i className="fas fa-file-pdf"></i> Create PDF
                         </>
                    )}
                </button>
            </div>

            {/* This is the div that html2pdf will capture */}
            {/* Add 'printable-area' class for potential specific styling */}
            <div ref={labelsContainerRef} className="labels-container printable-area">
                 {/* Add placeholders for offset */}
                 {placeholderCells.map((_, index) => (
                    <div key={`offset-${index}`} className="label-cell placeholder"></div>
                ))}

                {/* Render actual labels */}
                {labelsToRender.map((label, index) => {
                    const url = `${previewData.baseUrl}/packages/${label.id}`;
                    const qrOptions: QRCodeStylingOptions = {
                        type: 'svg', // Render as SVG
                        width: 80,
                        height: 80,
                        data: url,
                        margin: 0,
                        qrOptions: { errorCorrectionLevel: 'M' },
                        dotsOptions: { color: "#000080", type: "rounded" as DotType },
                        cornersSquareOptions: { color: "#000080", type: "extra-rounded" as CornerSquareType },
                        cornersDotOptions: { color: "#000080", type: "dot" as CornerDotType },
                        backgroundOptions: { color: "#ffffff" },
                    };

                    return (
                        <div key={`${label.id}-${index}`} className="label-cell">
                            <div className="label-content">
                                <QRCodeComponent options={qrOptions} />
                                <div className="label-text">
                                    <div className="label-id">{label.display_id}</div>
                                    <div className="label-location">{label.location || 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                    );
                 })}
            </div>
        </div>
    );
} 