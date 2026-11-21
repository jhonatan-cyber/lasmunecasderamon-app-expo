const fs = require('fs');
const path = require('path');

const root = path.resolve(path.join(__dirname, '..'));

// Files and styles to fix - manually verified from the search results
const fixes = [
    // EventItemCard: eventItem is Pressable, iconBox is circular icon (44x44)
    { file: 'components/cajero/administrativo/EventItemCard.tsx', styles: ['eventItem', 'iconBox'] },
    // SolicitudCard: iconBox is circular icon
    { file: 'components/cajero/SolicitudCard.tsx', styles: ['iconBox'] },
    // VentaDetailModal: clienteCard is inside Pressable
    { file: 'components/cajero/ventas/VentaDetailModal.tsx', styles: ['clienteCard'] },
    // ColacionWorkerModal: card is inside Pressable
    { file: 'components/colaciones/ColacionWorkerModal.tsx', styles: ['card'] },
    // AnticipoDetailModal: infoCard is inside Pressable
    { file: 'components/screens/anticipos/AnticipoDetailModal.tsx', styles: ['infoCard'] },
    // ColacionesScreen: mlCard is inside Pressable
    { file: 'components/screens/ColacionesScreen.tsx', styles: ['mlCard'] },
    // ConfiguracionAsistenciaScreen: card is inside Pressable
    { file: 'components/screens/ConfiguracionAsistenciaScreen.tsx', styles: ['card'] },
    // SelectedEventsBar: bar is inside Pressable
    { file: 'components/screens/home/SelectedEventsBar.tsx', styles: ['bar'] },
    // SelectedEventsModal: eventItem is inside Pressable, eventIcon is circular
    { file: 'components/screens/home/SelectedEventsModal.tsx', styles: ['eventItem', 'eventIcon'] },
    // BaucherFoto: visor is Pressable style
    { file: 'components/shared/BaucherFoto.tsx', styles: ['visor'] },
    // PremiumLiquidationCard: card is inside Pressable
    { file: 'components/shared/PremiumLiquidationCard.tsx', styles: ['card'] },
    // NotificationBanner: card is inside Pressable, iconCircle is circular
    { file: 'components/ui/NotificationBanner.tsx', styles: ['card', 'iconCircle'] },
    // StaffCallOverlay: iconBox is inside Pressable (action button)
    { file: 'components/shared/StaffCallOverlay.tsx', styles: ['iconBox'] },
    // OnboardingTour: iconContainer is circular
    { file: 'components/ui/OnboardingTour.tsx', styles: ['iconContainer'] },
    // PremiumTabBar: iconSlot and iconSlotCompact are circular (width=height)
    { file: 'components/ui/PremiumTabBar.tsx', styles: ['iconSlot', 'iconSlotCompact'] },
    // AttendanceCodeDisplay: iconCircle is circular
    { file: 'components/anfitriona/AttendanceCodeDisplay.tsx', styles: ['iconCircle'] },
    // TransferCard: iconWrapper is circular
    { file: 'components/barman/bar/TransferCard.tsx', styles: ['iconWrapper'] },
    // TransferDetailModal: quantityCard is inside Pressable
    { file: 'components/barman/bar/TransferDetailModal.tsx', styles: ['quantityCard'] },
    // CajaModales: infoBox is inside Pressable
    { file: 'components/cajero/caja/CajaModales.tsx', styles: ['infoBox'] },
    // PaymentMethodSelect: card is inside Pressable
    { file: 'components/cajero/forms/PaymentMethodSelect.tsx', styles: ['card'] },
    // CollapsibleSection: container is Pressable (collapsible header)
    { file: 'components/cajero/nueva-venta/CollapsibleSection.tsx', styles: ['container'] },
    // PersonalQRNoCodeView: iconCircle is circular
    { file: 'components/cajero/personal/PersonalQRNoCodeView.tsx', styles: ['iconCircle'] },
    // EmployeeListError: container is inside Pressable
    { file: 'components/shared/EmployeeListError.tsx', styles: ['container'] },
    // EventDetailModal: detailCard is inside Pressable, detailIconBox is circular
    { file: 'components/shared/EventDetailModal.tsx', styles: ['detailCard', 'detailIconBox'] },
    // RegistroAsistenciaModal: iconCircle, qrIconCircle are circular
    { file: 'components/shared/RegistroAsistenciaModal.tsx', styles: ['iconCircle', 'qrIconCircle'] },
    // SolicitarAnticipoModal: disponibleCard is inside Pressable
    { file: 'components/shared/SolicitarAnticipoModal.tsx', styles: ['disponibleCard'] },
    // AsistenciaDetailModal: recordCard is inside Pressable
    { file: 'components/screens/asistencia/AsistenciaDetailModal.tsx', styles: ['recordCard'] },
    // ServiceDetailModal: comisionBox, miComisionBox are inside Pressable
    { file: 'components/anfitriona/ServiceDetailModal.tsx', styles: ['comisionBox', 'miComisionBox'] },
    // ContainerReturnPanel: resultCard is inside Pressable
    { file: 'components/barman/bar/ContainerReturnPanel.tsx', styles: ['resultCard'] },
    // CalendarFilter: attendanceDot is 5x5 dot (2.5 is correct, skip), container is generic
    // DateRangeFilterModal: same as above
    // ErrorState: inlineRetry, container, iconContainer, inlineIconBox - check if they have borderRadius
    // ActionSheet: handle - decorative, skip
    // ModalBottomSheet: dragHandle - decorative, skip
    // DetailedEventsModal: dragHandle - decorative, skip
    // CategoryProductModal: handle - decorative, skip
    // ServiceCardActions: handle - decorative, skip
    // NuevaVentaModals: content - generic, skip
    // NuevaVentaSearch: container - generic, skip
    // PersonalQRUserView: qrGlow - decorative, skip
    // CheckoutModal: metaRow, receipt, totals - receipt layout, skip
    // SolicitudCard: cardUsual, cardBody, responseBox - card parts, skip
    // ColacionWorkerModal: row - generic, skip
    // StaffCallOverlay: typeText - text, skip
    // PremiumCalendar: legendItem already has 999, skip
    // AttendanceCodeDisplay: qrWrapper - decorative, skip
    // MovementDetailModal: iconWrap already fixed
    // BaucherFoto: cerrar already fixed
];

let totalFilesModified = 0;
let totalChanges = 0;

for (const { file, styles } of fixes) {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) {
        console.log(`✗ Not found: ${file}`);
        continue;
    }
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;
    let changes = 0;
    
    for (const styleName of styles) {
        // Handle both multi-line and single-line style definitions
        // Multi-line: styleName: { ... borderRadius: number ... }
        // Single-line: styleName: { ... borderRadius: number, ... }
        
        // First try multi-line (borderRadius on its own line)
        const multiLineRegex = new RegExp(
            `(\\b${styleName}\\s*:\\s*\\{[^}]*?\\n[^}]*?borderRadius\\s*:\\s*)\\d+`,
            'g'
        );
        
        let match;
        while ((match = multiLineRegex.exec(content)) !== null) {
            const oldText = match[0];
            const newText = match[1] + 'BorderRadius.full';
            content = content.replace(oldText, newText);
            changed = true;
            changes++;
        }
        
        // Then try single-line (borderRadius on same line as styleName)
        const singleLineRegex = new RegExp(
            `(\\b${styleName}\\s*:\\s*\\{[^}]*?)borderRadius\\s*:\\s*\\d+([^}]*\\})`,
            'g'
        );
        
        while ((match = singleLineRegex.exec(content)) !== null) {
            const oldText = match[0];
            const newText = match[1] + 'borderRadius: BorderRadius.full' + match[2];
            content = content.replace(oldText, newText);
            changed = true;
            changes++;
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
        console.log(`✓ ${file}: ${changes} changes (${styles.join(', ')})`);
    } else {
        console.log(`⊘ No changes: ${file} (${styles.join(', ')})`);
    }
}

console.log(`\nTotal: ${totalChanges} changes in ${totalFilesModified} files`);
