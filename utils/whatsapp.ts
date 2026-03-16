import * as Linking from 'expo-linking';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

interface WhatsAppOptions {
    phoneNumber: string;
    message: string;
}

export const openWhatsApp = async ({ phoneNumber, message }: WhatsAppOptions): Promise<boolean> => {
    try {
        const cleanedNumber = phoneNumber.replace(/\D/g, '');
        const encodedMessage = encodeURIComponent(message);
        const url = `https://wa.me/${cleanedNumber}?text=${encodedMessage}`;
        
        const canOpen = await Linking.canOpenURL(url);
        
        if (canOpen) {
            await Linking.openURL(url);
            return true;
        } else {
            console.log('WhatsApp not available');
            return false;
        }
    } catch (error) {
        console.error('Error opening WhatsApp:', error);
        return false;
    }
};

export const sendWhatsAppMessage = async (phoneNumber: string, message: string): Promise<boolean> => {
    return openWhatsApp({ phoneNumber, message });
};

export const shareReportViaWhatsApp = async (
    reportTitle: string,
    reportData: any,
    format: 'pdf' | 'text' = 'pdf'
): Promise<boolean> => {
    try {
        if (format === 'pdf') {
            const html = generateReportHTML(reportTitle, reportData);
            const { uri } = await Print.printToFileAsync({ html });
            
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Compartir reporte',
                    UTI: 'com.adobe.pdf'
                });
                return true;
            }
        } else {
            const text = generateReportText(reportTitle, reportData);
            const shareUrl = `mailto:?subject=${encodeURIComponent(reportTitle)}&body=${encodeURIComponent(text)}`;
            await Linking.openURL(shareUrl);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error sharing report:', error);
        return false;
    }
};

function generateReportHTML(title: string, data: any): string {
    let rows = '';
    
    if (Array.isArray(data)) {
        data.forEach((item, index) => {
            const values = Object.values(item).map(v => `<td>${v}</td>`).join('');
            rows += `<tr><td>${index + 1}</td>${values}</tr>`;
        });
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #6366f1; color: white; }
            .total { font-weight: bold; margin-top: 20px; }
        </style>
    </head>
    <body>
        <h1>${title}</h1>
        <p>Fecha: ${new Date().toLocaleDateString('es-PE')}</p>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    ${Object.keys(data[0] || {}).map(k => `<th>${k}</th>`).join('')}
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    </body>
    </html>
    `;
}

function generateReportText(title: string, data: any): string {
    let text = `${title}\n${'='.repeat(40)}\n\nFecha: ${new Date().toLocaleDateString('es-PE')}\n\n`;
    
    if (Array.isArray(data)) {
        data.forEach((item, index) => {
            text += `${index + 1}. ${JSON.stringify(item)}\n`;
        });
    } else {
        text += JSON.stringify(data, null, 2);
    }
    
    return text;
}

export const formatPhoneForWhatsApp = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('51')) {
        return cleaned.substring(2);
    }
    return cleaned;
};

export const getPredefinedMessages = {
    clientNotification: (name: string, amount: number) => 
        `Hola ${name}, tu consumo total es S/ ${amount.toFixed(2)}. Gracias por visitarnos!`,
    
    serviceComplete: (serviceType: string, room: string) =>
        `Tu servicio de ${serviceType} en la sala ${room} ha terminado. Gracias por tu visita!`,
    
    reservationConfirm: (date: string, time: string) =>
        `Tu reservación para el ${date} a las ${time} ha sido confirmada. Te esperamos!`,
    
    reservationCancel: (date: string) =>
        `Tu reservación del ${date} ha sido cancelada. Si necesitas más información, contáctanos.`,
    
    generalNotification: (message: string) => message,
};