const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'components');

// Keywords that indicate interactive elements
const interactiveKeywords = [
    'btn', 'button', 'boton', 'input', 'select', 'badge', 'chip', 'pill',
    'toggle', 'switch', 'checkbox', 'radio', 'link', 'action', 'pressable',
    'menuitem', 'tabitem', 'navitem', 'iconbtn', 'fab', 'cta', 'submit',
    'cancel', 'close', 'delete', 'remove', 'add', 'create', 'save', 'edit',
    'search', 'filter', 'sort', 'option', 'choice', 'item', 'card',
    'category', 'format', 'method', 'payment', 'client', 'product',
    'swatch', 'colorpicker', 'theme', 'picker', 'selector',
    'tag', 'label', 'alert', 'notice', 'banner', 'toast',
    'slider', 'thumb', 'track', 'range', 'progress',
    'avatar', 'user', 'profile', 'icon', 'image', 'photo',
    'dot', 'indicator', 'step', 'page', 'carousel',
    'badge', 'counter', 'count', 'number', 'amount', 'price',
    'metric', 'stat', 'summary', 'total', 'subtotal',
    'header', 'footer', 'title', 'subtitle', 'label', 'text',
    'inline', 'small', 'mini', 'tiny', 'compact', 'dense',
    'rounded', 'circle', 'round', 'oval', 'ellipse',
    'iconBox', 'iconWrap', 'iconWrapper', 'iconSlot',
    'resultCard', 'infoCard', 'clienteCard', 'comisionBox',
    'todayCell', 'edgeCell', 'legendItem', 'inlineRetry',
    'dragHandle', 'handle', 'grabber',
    'overlay', 'modal', 'dialog', 'sheet', 'popup', 'drawer',
    'tooltip', 'popover', 'dropdown', 'menu', 'list', 'row',
    'cell', 'day', 'date', 'time', 'calendar',
    'notification', 'message', 'chat', 'bubble',
    'form', 'field', 'group', 'set', 'row', 'col',
    'grid', 'gridItem', 'gridCell',
    'sidebar', 'panel', 'section', 'group', 'wrapper',
    'container', 'box', 'div', 'view', 'layout',
    'card', 'tile', 'block', 'panel', 'area', 'zone',
    'hero', 'banner', 'jumbotron', 'callout', 'feature',
    'footer', 'nav', 'header', 'sidebar', 'aside',
    'main', 'content', 'body', 'article', 'section',
    'list', 'table', 'grid', 'gallery', 'carousel',
    'form', 'input', 'textarea', 'select', 'button',
    'checkbox', 'radio', 'switch', 'toggle', 'slider',
    'range', 'color', 'date', 'time', 'file', 'search',
    'link', 'anchor', 'button', 'submit', 'reset',
    'menu', 'dropdown', 'popover', 'tooltip', 'modal',
    'dialog', 'alert', 'notification', 'toast', 'banner',
    'badge', 'tag', 'chip', 'pill', 'label', 'ribbon',
    'avatar', 'icon', 'image', 'photo', 'video', 'audio',
    'progress', 'spinner', 'loader', 'skeleton', 'placeholder',
    'tab', 'step', 'wizard', 'pagination', 'breadcrumb',
    'accordion', 'collapsible', 'expandable', 'collapsable',
    'tree', 'list', 'table', 'grid', 'gallery', 'carousel',
    'timeline', 'calendar', 'date', 'time', 'clock',
    'chart', 'graph', 'diagram', 'map', 'globe',
    'code', 'pre', 'text', 'quote', 'blockquote',
    'kbd', 'samp', 'var', 'abbr', 'cite', 'dfn',
    'mark', 'del', 'ins', 'sub', 'sup', 'small',
    'strong', 'em', 'b', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'figure',
    'figcaption', 'table', 'thead', 'tbody', 'tfoot',
    'tr', 'th', 'td', 'caption', 'col', 'colgroup',
    'details', 'summary', 'fieldset', 'legend', 'optgroup',
    'option', 'datalist', 'output', 'progress', 'meter',
    'dialog', 'menu', 'menuitem', 'nav', 'main', 'article',
    'section', 'aside', 'footer', 'header', 'hgroup',
    'address', 'figure', 'figcaption', 'main', 'search',
    'form', 'input', 'button', 'select', 'textarea',
    'label', 'fieldset', 'legend', 'optgroup', 'option',
    'datalist', 'output', 'progress', 'meter', 'dialog',
    'menu', 'menuitem', 'nav', 'main', 'article', 'section',
    'aside', 'footer', 'header', 'hgroup', 'address',
    'figure', 'figcaption', 'details', 'summary', 'table',
    'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    'col', 'colgroup', 'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'blockquote', 'pre', 'code', 'samp', 'kbd', 'var',
    'abbr', 'cite', 'dfn', 'mark', 'del', 'ins', 'sub',
    'sup', 'small', 'strong', 'em', 'b', 'i', 'u', 's',
    'strike', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p',
    'span', 'a', 'img', 'br', 'hr', 'wbr', 'embed',
    'object', 'param', 'video', 'audio', 'source', 'track',
    'canvas', 'svg', 'math', 'iframe', 'noscript', 'script',
    'style', 'link', 'meta', 'title', 'base', 'html',
    'head', 'body', '!DOCTYPE'
];

// More specific keywords for interactive elements
const buttonKeywords = [
    'btn', 'button', 'boton', 'input', 'select', 'badge', 'chip', 'pill',
    'toggle', 'checkbox', 'radio', 'link', 'action', 'pressable',
    'menuitem', 'tabitem', 'iconbtn', 'fab', 'cta', 'submit',
    'cancel', 'close', 'delete', 'remove', 'add', 'create', 'save', 'edit',
    'search', 'filter', 'sort', 'option', 'choice',
    'category', 'format', 'method', 'payment', 'client', 'product',
    'swatch', 'picker', 'selector',
    'tag', 'alert', 'notice', 'banner',
    'slider', 'thumb',
    'iconBox', 'iconWrap', 'iconWrapper', 'iconSlot',
    'resultCard', 'infoCard', 'clienteCard', 'comisionBox',
    'todayCell', 'edgeCell', 'legendItem', 'inlineRetry',
    'overlay', 'modal', 'dialog', 'sheet', 'popup',
    'tooltip', 'popover', 'dropdown',
    'notification', 'message', 'bubble',
    'field', 'cell', 'day', 'date',
    'item', 'card', 'tile',
    'tab', 'step', 'pagination',
    'accordion', 'collapsible',
    'swipeable', 'draggable', 'resizable',
    'interactive', 'clickable', 'tappable', 'touchable',
    'pressed', 'active', 'hover', 'focus', 'disabled',
    'primary', 'secondary', 'tertiary', 'ghost', 'outline',
    'text', 'link', 'icon', 'image', 'photo',
    'small', 'mini', 'tiny', 'compact', 'dense',
    'rounded', 'circle', 'round', 'oval'
];

function isInteractiveStyleName(styleName) {
    const lowerName = styleName.toLowerCase();
    return buttonKeywords.some(keyword => lowerName.includes(keyword));
}

function findInteractiveBorderRadius(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const results = [];
    
    // Match style definitions with borderRadius
    const styleRegex = /(\w+)\s*:\s*\{([^}]*borderRadius\s*:\s*(\d+)[^}]*)\}/g;
    let match;
    
    while ((match = styleRegex.exec(content)) !== null) {
        const styleName = match[1];
        const styleBody = match[2];
        const borderRadiusValue = match[3];
        
        if (isInteractiveStyleName(styleName)) {
            results.push({
                styleName,
                borderRadiusValue,
                line: content.substring(0, match.index).split('\n').length
            });
        }
    }
    
    // Also check inline styles
    const inlineRegex = /borderRadius\s*:\s*(\d+)/g;
    while ((match = inlineRegex.exec(content)) !== null) {
        const borderRadiusValue = match[1];
        const line = content.substring(0, match.index).split('\n').length;
        
        // Check if this is in a Pressable, TouchableOpacity, or similar component
        const contextStart = Math.max(0, match.index - 200);
        const contextEnd = Math.min(content.length, match.index + 200);
        const context = content.substring(contextStart, contextEnd);
        
        if (context.includes('Pressable') || context.includes('TouchableOpacity') || 
            context.includes('onPress') || context.includes('TextInput') ||
            context.includes('accessibilityRole')) {
            results.push({
                styleName: 'inline',
                borderRadiusValue,
                line,
                context: context.trim().substring(0, 100)
            });
        }
    }
    
    return results;
}

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

const files = getAllTsxFiles(componentsDir);
const allResults = [];

for (const file of files) {
    const results = findInteractiveBorderRadius(file);
    if (results.length > 0) {
        const relativePath = path.relative(__dirname, file);
        allResults.push({
            file: relativePath,
            styles: results
        });
    }
}

console.log(JSON.stringify(allResults, null, 2));
