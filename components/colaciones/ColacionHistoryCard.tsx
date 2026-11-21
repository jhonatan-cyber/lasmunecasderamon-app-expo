import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ColacionHistoryCardProps {
  fecha: string;
  nickRecibio: string;
  nickAtendio: string;
  nombreBebida: string;
  acompanamiento: string | null;
  ml: number;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
}

export const ColacionHistoryCard: React.FC<ColacionHistoryCardProps> = ({
  fecha,
  nickRecibio,
  nickAtendio,
  nombreBebida,
  acompanamiento,
  ml,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
}) => {
  const fechaStr = fecha ? new Date(fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '';
  const hora = fecha ? new Date(fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

  return (
    <View style={[styles.historyCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.historyCardLeft}>
        <Text style={[styles.historyCardNick, { color: textPrimary }]}>
          {nickRecibio}
        </Text>
        <Text style={[styles.historyCardProduct, { color: textSecondary }]}>
          {nombreBebida}
        </Text>
        <View style={styles.historyCardMeta}>
          <Text style={[styles.historyCardMetaText, { color: textSecondary }]}>
            {ml} ml
          </Text>
          {acompanamiento ? (
            <Text style={[styles.historyCardMetaText, { color: textSecondary }]}>
              · {acompanamiento}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.historyCardRight}>
        <Text style={[styles.historyCardBy, { color: textSecondary }]}>↘ {nickAtendio}</Text>
        <View style={styles.historyCardDateTime}>
          {fechaStr ? (
            <Text style={[styles.historyCardDate, { color: textSecondary }]}>{fechaStr}</Text>
          ) : null}
          {hora ? (
            <Text style={[styles.historyCardTime, { color: textSecondary }]}>{hora}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  historyCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCardLeft: {
    flex: 1,
    gap: 2,
  },
  historyCardNick: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyCardProduct: {
    fontSize: 12,
    fontWeight: '500',
  },
  historyCardRight: {
    alignItems: 'flex-end',
  },
  historyCardBy: {
    fontSize: 12,
    fontWeight: '500',
  },
  historyCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  historyCardMetaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyCardDateTime: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  historyCardDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyCardTime: {
    fontSize: 11,
    fontWeight: '600',
  },
});
