const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

function checkExactMatch(fullPath) {
    if (!fs.existsSync(fullPath)) return { expected: path.basename(fullPath), actual: null, notFound: true }; // File doesn't exist at all
    
    // Walk up to root and check case for each segment
    let current = fullPath;
    let parent = path.dirname(current);
    
    while (current !== ROOT_DIR && parent !== current) {
        const basename = path.basename(current);
        const parentContents = fs.readdirSync(parent);
        
        if (!parentContents.includes(basename)) {
            // Find the actual name
            const actualName = parentContents.find(p => p.toLowerCase() === basename.toLowerCase());
            return { expected: basename, actual: actualName, directory: parent };
        }
        
        current = parent;
        parent = path.dirname(current);
    }
    
    return true; // Exact match
}

function processJsFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    let match;
    const issues = [];
    
    while ((match = requireRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
            let fullPath = path.resolve(path.dirname(filePath), importPath);
            // Handle extensionless requires
            if (!fs.existsSync(fullPath) && fs.existsSync(fullPath + '.js')) {
                fullPath += '.js';
            } else if (!fs.existsSync(fullPath) && !fullPath.endsWith('.js')) {
                // still check if it's completely missing
                fullPath += '.js';
            }
            
            const matchStatus = checkExactMatch(fullPath);
            if (matchStatus && matchStatus !== true) {
                issues.push({ type: 'require', file: filePath, importPath, issue: matchStatus });
            }
        }
    }
    return issues;
}

function processEjsFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    // Check includes
    const includeRegex = /<%-?\s*include\(['"]([^'"]+)['"]\)/g;
    let match;
    while ((match = includeRegex.exec(content)) !== null) {
        let importPath = match[1];
        let fullPath = path.resolve(path.dirname(filePath), importPath);
        if (!fullPath.endsWith('.ejs') && !fs.existsSync(fullPath) && fs.existsSync(fullPath + '.ejs')) {
            fullPath += '.ejs';
        } else if (!fullPath.endsWith('.ejs')) {
            fullPath += '.ejs';
        }
        const matchStatus = checkExactMatch(fullPath);
        if (matchStatus && matchStatus !== true) {
            issues.push({ type: 'ejs-include', file: filePath, importPath, issue: matchStatus });
        }
    }
    
    // Check static assets (href, src)
    const assetRegex = /(?:href|src)=['"]([^'"]+)['"]/g;
    while ((match = assetRegex.exec(content)) !== null) {
        let assetPath = match[1];
        // Strip query params or hash
        assetPath = assetPath.split('?')[0].split('#')[0];
        
        if (assetPath.startsWith('/') && !assetPath.startsWith('//')) {
            let fullPath = path.join(PUBLIC_DIR, assetPath);
            const matchStatus = checkExactMatch(fullPath);
            if (matchStatus && matchStatus !== true) {
                issues.push({ type: 'static-asset', file: filePath, importPath: assetPath, issue: matchStatus });
            }
        } else if (assetPath.startsWith('.') && !assetPath.startsWith('//') && !assetPath.startsWith('http')) {
             let fullPath = path.join(path.dirname(filePath), assetPath);
             const matchStatus = checkExactMatch(fullPath);
             if (matchStatus && matchStatus !== true) {
                 issues.push({ type: 'static-asset-relative', file: filePath, importPath: assetPath, issue: matchStatus });
             }
        }
    }
    return issues;
}

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('public')) {
                results = results.concat(walkDir(fullPath));
            }
        } else {
            if (file.endsWith('.js')) {
                results = results.concat(processJsFile(fullPath));
            } else if (file.endsWith('.ejs') || file.endsWith('.html')) {
                results = results.concat(processEjsFile(fullPath));
            }
        }
    });
    return results;
}

const allIssues = walkDir(ROOT_DIR);
console.log(JSON.stringify(allIssues, null, 2));
