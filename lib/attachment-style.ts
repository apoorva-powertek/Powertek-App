export function attachmentStyle(name: string) {
  const value = name.toUpperCase();
  if (/PRIMARY|HIGH.?VOLT|PHASE/.test(value)) return { color: "#ff8250", kind: "primary", label: "Primary" };
  if (/NEUTRAL|SECONDARY/.test(value)) return { color: "#f5b83b", kind: "neutral", label: "Neutral" };
  if (/COMM|TEL|CATV|FIBER|PHONE/.test(value)) return { color: "#5da9ff", kind: "communication", label: "Communication" };
  if (/GUY|ANCHOR/.test(value)) return { color: "#66d8b6", kind: "guy", label: "Guy" };
  if (/INSULATOR|PIN|SPOOL|DEAD.?END/.test(value)) return { color: "#d5b7ff", kind: "insulator", label: "Insulator" };
  if (/TRANSFORMER/.test(value)) return { color: "#ed93ff", kind: "transformer", label: "Transformer" };
  if (/CUTOUT|FUSE|SWITCH|LIGHT|METER|CABINET|ANTENNA|RISER|EQUIPMENT/.test(value)) return { color: "#4fdcc4", kind: "equipment", label: "Equipment" };
  return { color: "#a9bdcc", kind: "attachment", label: "Attachment" };
}

