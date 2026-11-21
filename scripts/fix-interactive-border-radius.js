const fs = require('fs');
const path = require('path');

const root = path.resolve(path.join(__dirname, '..'));
const componentsDir = path.join(root, 'components');

function findTsxFiles(dir) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(findTsxFiles(fullPath));
        } else if (entry.name.endsWith('.tsx')) {
            results.push(fullPath);
        }
    }
    return results;
}

// Styles that are clearly interactive (buttons, inputs, selects, selectable items)
// Exclude: iconCircle, iconBox, iconContainer, iconWrap, iconWrapper (circular by design)
// Exclude: handle, dragHandle (decorative)
// Exclude: attendanceDot (5x5 dot, 2.5 is correct)
// Exclude: qrWrapper, qrGlow (decorative)
// Exclude: metaRow, receipt, totals (receipt layout)
// Exclude: container, content, row (generic containers)
// Exclude: typeText (text element)
// Exclude: cardBody, responseBox (card parts, not the card itself)
// Exclude: sessionRow (row layout)
// Exclude: detailCard, detailIconBox (detail display)
// Exclude: cardUsual (card variant)

const interactiveStylesToFix = {
    // PremiumCalendar: day selector
    'PremiumCalendar.tsx': ['dayInner', 'legendItem'],
    // ProfileThemePicker: color swatch selector
    'ProfileThemePicker.tsx': ['swatch'],
    // CalendarFilter: calendar cells
    'CalendarFilter.tsx': ['todayCell'],
    // DateRangeFilterModal: calendar cells
    'DateRangeFilterModal.tsx': ['todayCell', 'edgeCell'],
    // ErrorState: retry button
    'ErrorState.tsx': ['inlineRetry'],
    // BaucherFoto: close and retry buttons
    'BaucherFoto.tsx': ['cerrar', 'reintentar'],
    // EventItemCard: clickable event item
    'EventItemCard.tsx': ['eventItem'],
    // SelectedEventsModal: clickable event item
    'SelectedEventsModal.tsx': ['eventItem'],
    // TransferCard: card used as Pressable
    'TransferCard.tsx': ['card'],
    // SolicitudCard: card used as Pressable
    'SolicitudCard.tsx': ['card'],
    // PaymentMethodSelect: card used as Pressable (select)
    'PaymentMethodSelect.tsx': ['card'],
    // PremiumLiquidationCard: card used as Pressable
    'PremiumLiquidationCard.tsx': ['card'],
    // ColacionesScreen: mlCard used as Pressable
    'ColacionesScreen.tsx': ['mlCard'],
    // ConfiguracionAsistenciaScreen: card used as Pressable
    'ConfiguracionAsistenciaScreen.tsx': ['card'],
    // PropinasScreen: card used as Pressable
    'PropinasScreen.tsx': ['card'],
    // NotificationBanner: card used as Pressable
    'NotificationBanner.tsx': ['card'],
    // TransferDetailModal: quantityCard used as Pressable
    'TransferDetailModal.tsx': ['quantityCard'],
    // VentaDetailModal: infoCard used as Pressable
    'VentaDetailModal.tsx': ['infoCard'],
    // AnticipoDetailModal: infoCard used as Pressable
    'AnticipoDetailModal.tsx': ['infoCard'],
    // SolicitarAnticipoModal: disponibleCard used as Pressable
    'SolicitarAnticipoModal.tsx': ['disponibleCard'],
    // ContainerReturnPanel: resultCard used as Pressable
    'ContainerReturnPanel.tsx': ['resultCard'],
    // ServiceDetailModal: gridItem used as Pressable (selectable)
    'ServiceDetailModal.tsx': ['gridItem'],
    // AsistenciaDetailModal: recordCard used as Pressable
    'AsistenciaDetailModal.tsx': ['recordCard'],
    // CollapsibleSection: container used as Pressable (collapsible header)
    'CollapsibleSection.tsx': ['container'],
    // SelectedEventsBar: bar used as Pressable
    'SelectedEventsBar.tsx': ['bar'],
    // StaffCallOverlay: iconBox used as Pressable (action button)
    'StaffCallOverlay.tsx': ['iconBox'],
    // AttendanceCodeDisplay: iconCircle used as Pressable
    'AttendanceCodeDisplay.tsx': ['iconCircle'],
    // MovementDetailModal: iconWrap used as Pressable
    'MovementDetailModal.tsx': ['iconWrap'],
    // DetailedEventsModal: dragHandle (keep original, it's a handle)
    // 'DetailedEventsModal.tsx': [],
    // CajaModales: infoBox used as Pressable
    'CajaModales.tsx': ['infoBox'],
    // CheckoutModal: no specific interactive styles
    // CategoryProductModal: handle (keep original)
    // NuevaVentaModals: content (generic container, skip)
    // NuevaVentaSearch: container (generic, skip)
    // PersonalQRNoCodeView: iconCircle used as Pressable
    'PersonalQRNoCodeView.tsx': ['iconCircle'],
    // PersonalQRUserView: qrGlow (decorative, skip)
    // ServiceCardActions: handle (keep original)
    // ColacionWorkerModal: card used as Pressable
    'ColacionWorkerModal.tsx': ['card'],
    // EmployeeListError: container used as Pressable
    'EmployeeListError.tsx': ['container'],
    // EventDetailModal: detailCard used as Pressable
    'EventDetailModal.tsx': ['detailCard'],
    // RegistroAsistenciaModal: iconCircle used as Pressable
    'RegistroAsistenciaModal.tsx': ['iconCircle'],
    // ActionSheet: handle (keep original)
    // ModalBottomSheet: dragHandle (keep original)
    // OnboardingTour: iconContainer used as Pressable
    'OnboardingTour.tsx': ['iconContainer'],
    // PremiumTabBar: iconSlot (circular by design, skip)
};

const allFiles = findTsxFiles(componentsDir);
let totalFilesModified = 0;
let totalChanges = 0;

for (const [fileName, stylesToFix] of Object.entries(interactiveStylesToFix)) {
    if (stylesToFix.length === 0) continue;
    
    // Find the file
    const filePath = allFiles.find(f => f.endsWith(fileName));
    if (!filePath) {
        console.log(`✗ Not found: ${fileName}`);
        continue;
    }
    
    let content = fs.readFileSync(filePath, 'utf-8');
    const relPath = path.relative(root, filePath);
    
    if (!content.match(/borderRadius\s*:\s*\d+/)) {
        console.log(`⊘ No hardcoded borderRadius: ${relPath}`);
        continue;
    }
    
    let changed = false;
    let changes = 0;
    
    // Fix each style
    for (const styleName of stylesToFix) {
        // Match styleName: { ... borderRadius: number ... }
        const regex = new RegExp(
            `(\\b${styleName}\\s*:\\s*\\{)([\\s\\S]*?)(borderRadius\\s*:\\s*)\\d+([^}\\n]*\\})`,
            'g'
        );
        
        const newContent = content.replace(regex, (match, p1, p2, p3, p4) => {
            // Check if it already has BorderRadius.full
            if (p2.includes('BorderRadius.full')) return match;
            changed = true;
            changes++;
            return `${p1}${p2}${p3}BorderRadius.full${p4}`;
        });
        
        if (newContent !== content) {
            content = newContent;
        }
    }
    
    if (changed) {
        // Add BorderRadius import if needed
        const hasBorderRadiusImport = /import\s+{[^}]*BorderRadius[^}]*}\s+from\s+['"]@\/constants\/spacing['"]/.test(content);
        if (!hasBorderRadiusImport && content.includes('BorderRadius.full')) {
            const spacingImportMatch = content.match(/import\s+{([^}]+)}\s+from\s+['"]@\/constants\/spacing['"]/);
            if (spacingImportMatch) {
                const imports = spacingImportMatch[1];
                if (!imports.includes('BorderRadius')) {
                    content = content.replace(
                        /import\s+{([^}]+)}\s+from\s+['"]@\/constants\/spacing['"]/,
                        (match, inner) => {
                            const trimmed = inner.trim();
                            return `import { ${trimmed}, BorderRadius } from '@/constants/spacing'`;
                        }
                    );
                }
            } else {
                // Add new import after the first import
                const firstImportMatch = content.match(/(import\s+.*from\s+['"].*['"];\s*\n)/);
                if (firstImportMatch) {
                    content = content.replace(
                        /(import\s+.*from\s+['"].*['"];\s*\n)/,
                        `$1import { BorderRadius } from '@/constants/spacing';\n`
                    );
                }
            }
        }
        
        fs.writeFileSync(filePath, content, 'utf-8');
        totalFilesModified++;
        totalChanges += changes;
        console.log(`✓ ${relPath}: ${changes} changes (${stylesToFix.join(', ')})`);
    } else {
        console.log(`⊘ No changes needed: ${relPath}`);
    }
}

console.log(`\nTotal: ${totalChanges} changes in ${totalFilesModified} files`);
