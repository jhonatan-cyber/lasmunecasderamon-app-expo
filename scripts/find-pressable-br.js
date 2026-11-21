const fs = require('fs');
const path = require('path');

const componentsDir = path.join(path.dirname(__dirname), 'components');

function getAllTsxFiles(dir) {
    let results = [];
    try {
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat && stat.isDirectory()) {
                results = results.concat(getAllTsxFiles(filePath));
            } else if (file.endsWith('.tsx')) {
                results.push(filePath);
            }
        });
    } catch (err) {
        // ignore
    }
    return results;
}

function findPressableWithHardcodedBR(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const results = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this line has borderRadius with a number
        const brMatch = line.match(/borderRadius\s*:\s*(\d+)/);
        if (!brMatch) continue;
        
        const brValue = brMatch[1];
        
        // Check context (50 lines before and after) for Pressable, TouchableOpacity, onPress, TextInput
        const contextStart = Math.max(0, i - 50);
        const contextEnd = Math.min(lines.length, i + 50);
        const context = lines.slice(contextStart, contextEnd).join('\n');
        
        const isInteractive = context.includes('Pressable') || 
                             context.includes('TouchableOpacity') ||
                             context.includes('onPress') ||
                             context.includes('TextInput') ||
                             context.includes('accessibilityRole');
        
        if (isInteractive) {
            results.push({
                line: i + 1,
                lineContent: line.trim(),
                brValue
            });
        }
    }
    
    return results;
}

const files = getAllTsxFiles(componentsDir);
const allResults = [];

for (const file of files) {
    const results = findPressableWithHardcodedBR(file);
    if (results.length > 0) {
        const relativePath = path.relative(path.dirname(__dirname), file);
        allResults.push({
            file: relativePath,
            matches: results
        });
    }
}

console.log(JSON.stringify(allResults, null, 2));
