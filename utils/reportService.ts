import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';

export type ExportFormat = 'pdf' | 'csv' | 'html';

interface ReportConfig {
    title: string;
    headers: string[];
    rows: any[];
    summary?: Record<string, any>;
    dateRange?: { start: string; end: string };
}

class ReportService {
    async exportSalesReport(config: ReportConfig): Promise<string | null> {
        try {
            const html = this.generateSalesHTML(config);
            const { uri } = await Print.printToFileAsync({ html });
            return uri;
        } catch (error) {
            console.error('Error exporting sales report:', error);
            return null;
        }
    }

    async exportAttendanceReport(config: ReportConfig): Promise<string | null> {
        try {
            const html = this.generateAttendanceHTML(config);
            const { uri } = await Print.printToFileAsync({ html });
            return uri;
        } catch (error) {
            console.error('Error exporting attendance report:', error);
            return null;
        }
    }

    async exportServicesReport(config: ReportConfig): Promise<string | null> {
        try {
            const html = this.generateServicesHTML(config);
            const { uri } = await Print.printToFileAsync({ html });
            return uri;
        } catch (error) {
            console.error('Error exporting services report:', error);
            return null;
        }
    }

    async exportToCSV(data: any[], filename: string): Promise<string | null> {
        try {
            if (data.length === 0) return null;

            const headers = Object.keys(data[0]);
            const csvRows = [
                headers.join(','),
                ...data.map(row => 
                    headers.map(header => {
                        const value = row[header];
                        const escaped = String(value).replace(/"/g, '""');
                        return `"${escaped}"`;
                    }).join(',')
                )
            ];

            const csvContent = csvRows.join('\n');
            const uri = FileSystem.documentDirectory + `${filename}.csv`;
            await FileSystem.writeAsStringAsync(uri, csvContent);
            
            return uri;
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            return null;
        }
    }

    async shareReport(uri: string, title: string): Promise<boolean> {
        try {
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Compartir ${title}`,
                    UTI: 'com.adobe.pdf'
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error sharing report:', error);
            return false;
        }
    }

    private generateSalesHTML(config: ReportConfig): string {
        const { title, headers, rows, summary, dateRange } = config;
        const total = rows.reduce((sum: number, row: any) => sum + (row.total || row.monto || 0), 0);
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${title}</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #333; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6366f1; padding-bottom: 20px; }
                .header h1 { color: #6366f1; font-size: 24px; margin-bottom: 5px; }
                .header .subtitle { color: #666; font-size: 14px; }
                .date-range { background: #f5f5f5; padding: 10px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background: #6366f1; color: white; padding: 12px; text-align: left; font-size: 12px; }
                td { padding: 10px; border-bottom: 1px solid #eee; font-size: 12px; }
                tr:nth-child(even) { background: #f9f9f9; }
                .summary { background: #f0f0ff; padding: 15px; border-radius: 8px; text-align: right; }
                .summary .total { font-size: 18px; font-weight: bold; color: #6366f1; }
                .footer { text-align: center; color: #999; font-size: 10px; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${title}</h1>
                <div class="subtitle">Las Muñecas de Ramón</div>
            </div>
            ${dateRange ? `<div class="date-range">Período: ${dateRange.start} - ${dateRange.end}</div>` : ''}
            <table>
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rows.map((row: any) => `
                        <tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="summary">
                <div>Total Ventas: <span class="total">S/ ${total.toFixed(2)}</span></div>
                ${summary ? `<div>Transacciones: ${summary.totalTransactions || rows.length}</div>` : ''}
            </div>
            <div class="footer">Generado el ${new Date().toLocaleString('es-PE')}</div>
        </body>
        </html>
        `;
    }

    private generateAttendanceHTML(config: ReportConfig): string {
        const { title, headers, rows, summary } = config;
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${title}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 20px; }
                h1 { color: #6366f1; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #6366f1; color: white; padding: 10px; }
                td { padding: 8px; border-bottom: 1px solid #eee; }
                .status { padding: 4px 8px; border-radius: 4px; font-size: 11px; }
                .presente { background: #dcfce7; color: #166534; }
                .ausente { background: #fee2e2; color: #991b1b; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${title}</h1>
                <p>Las Muñecas de Ramón</p>
            </div>
            <table>
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rows.map((row: any) => `
                        <tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>
            <p style="margin-top:20px;text-align:center;color:#666">
                Total: ${rows.length} registros - Generado: ${new Date().toLocaleString('es-PE')}
            </p>
        </body>
        </html>
        `;
    }

    private generateServicesHTML(config: ReportConfig): string {
        const { title, headers, rows, summary } = config;
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${title}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 20px; }
                h1 { color: #6366f1; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #6366f1; color: white; padding: 10px; }
                td { padding: 8px; border-bottom: 1px solid #eee; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${title}</h1>
                <p>Las Muñecas de Ramón</p>
            </div>
            <table>
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rows.map((row: any) => `
                        <tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
        `;
    }
}

export const reportService = new ReportService();