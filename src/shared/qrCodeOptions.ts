import QRCodeStyling, { Options } from 'qr-code-styling';

// Define the base options for QR codes used for printing
// We use the 80x80 size as the standard here.
export const baseQrCodeOptions: Options = {
    type: 'svg',
    width: 80, // Standard print size
    height: 80, // Standard print size
    margin: 0,
    imageOptions: { hideBackgroundDots: true, imageSize: 0.4, margin: 0 },
    qrOptions: { errorCorrectionLevel: 'M' },
    dotsOptions: { color: "#000000", roundSize: true, type: "dots" },
    cornersSquareOptions: { color: "#000000", type: "extra-rounded" },
    cornersDotOptions: { color: "#000000", type: "extra-rounded" },
    backgroundOptions: { color: "transparent" },
}; 