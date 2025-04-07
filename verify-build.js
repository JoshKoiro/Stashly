const fs = require('fs');
const path = require('path');

// Check if the CSS file exists in the expected location
const cssPath = path.join(__dirname, 'dist', 'public', 'assets', 'QRCodeLabelPreview.css');

if (fs.existsSync(cssPath)) {
  console.log('✅ CSS file exists at:', cssPath);
  console.log('File size:', fs.statSync(cssPath).size, 'bytes');
} else {
  console.error('❌ CSS file does not exist at:', cssPath);
  console.error('Please make sure the copy-css script is running correctly.');
  process.exit(1);
}

console.log('Build verification complete!'); 