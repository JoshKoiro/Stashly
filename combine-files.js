const fs = require('fs');
const path = require('path');

const directoryPath = './'; // Change to the directory you want to scan.
const outputFilePath = path.join(directoryPath, 'combined.txt');

/**
 * Recursively get all file paths in a directory and its subdirectories.
 * @param {string} dir - The directory to scan.
 * @returns {string[]} - An array of file paths.
 */
function getAllFiles(dir) {
    let files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            files = files.concat(getAllFiles(fullPath));
        } else {
            files.push(fullPath);
        }
    }

    // filter out all files in the .git folder
    files = files.filter((file) => !file.includes('.git'));
    // filter out binary files
    files = files.filter((file) => !file.includes('node_modules'));
    // filter out image files
    files = files.filter((file) => !file.includes('.png'));
    // filter out all files in the .vscode folder
    files = files.filter((file) => !file.includes('.vscode'));
    // remove any files that are excluded by the .gitignore file
    files = files.filter((file) => !file.includes('.gitignore'));
    return files;
}

/**
 * Combine the contents of all files into a single output file.
 */

// clear the contents of the output file if it exists
if (fs.existsSync(outputFilePath)) {
    fs.truncateSync(outputFilePath, 0);
}
function combineFiles() {
    const files = getAllFiles(directoryPath);

    // Stream to write combined content
    const writeStream = fs.createWriteStream(outputFilePath);

    console.log(`Combining files into ${outputFilePath}...`);
    files.forEach((file) => {
        if (file === outputFilePath) return; // Skip the output file itself
        console.log(`Processing: ${file}`);

        const content = fs.readFileSync(file, 'utf-8');
        writeStream.write(`\n--- File: ${file} ---\n`);
        writeStream.write(content);
    });

    writeStream.end(() => {
        console.log('All files have been combined successfully!');
    });
}

combineFiles();
