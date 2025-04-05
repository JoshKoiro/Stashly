import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import QRCodeStyling, { Options as QRCodeStylingOptions, CornerSquareType, CornerDotType, DotType } from 'qr-code-styling';
import { Package } from '../../backend/db/schema';
import './QRCodeLabelPreview.css';

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

    // Keep ref for potential future use, but not strictly needed for window.print()
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
    }, [packageIds, copies, offset]);

    // --- Renamed handler, now calls window.print() --- 
    const handlePrint = useCallback(() => {
        // No complex logic needed, just trigger browser print
        window.print();
    }, []); // No dependencies needed now

    if (loading) return <div className="loading">Loading label preview...</div>;
    if (error) return <div className="error">Error: {error} <Link to="/print-qr">Go Back</Link></div>;
    if (!previewData) return <div className="error">Could not load preview data. <Link to="/print-qr">Go Back</Link></div>;
    if (labelsToRender.length === 0) return <div className="info">No labels to display based on selection. <Link to="/print-qr">Go Back</Link></div>;

    const placeholderCells = Array(previewData ? previewData.offset % 30 : 0).fill(null);

    return (
        // Add a class to the root element for easier print targeting
        <div className="qr-label-preview-page print-root">
             <div className="preview-controls print-hide">
                 <Link to="/print-qr" className="back-btn">
                    <i className="fas fa-arrow-left"></i> Back to Selection
                 </Link>
                <h1>QR Label Preview</h1>
                {/* Update button text and action */}
                <button onClick={handlePrint} className="print-btn">
                    <i className="fas fa-print"></i> Print Labels
                </button>
            </div>

            {/* Container for labels */}
            <div ref={labelsContainerRef} className="labels-container printable-area">
                 {placeholderCells.map((_, index) => (
                    <div key={`offset-${index}`} className="label-cell placeholder"></div>
                ))}
                {labelsToRender.map((label, index) => {
                    const url = `${previewData.baseUrl}/packages/${label.id}`;
                    const qrOptions: QRCodeStylingOptions = {
                         type: 'svg', // KEEP SVG for best print quality
                        width: 80, height: 80, data: url, margin: 0,
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