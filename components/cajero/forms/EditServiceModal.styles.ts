import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxHeight: "90%",
    borderRadius: 24,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(156, 163, 175, 0.1)",
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
  },
  closeBtn: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  infoBox: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "rgba(139, 92, 246, 0.05)",
    borderRadius: 16,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "700",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  warningText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(156, 163, 175, 0.1)",
    gap: 12,
  },
  btn: {
    flex: 1,
    height: 54,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: {
    borderWidth: 1,
  },
  saveBtn: {
    elevation: 4,
    shadowColor: "#E11D48",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  btnText: {
    fontSize: 14,
    fontWeight: "900",
  },
  summaryBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    marginTop: 10,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: "900",
  },
});
