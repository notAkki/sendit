type ColorParticipant = {
  id: string;
  mergedInto?: string | null;
};

export function participantColor(index: number) {
  const goldenAngle = 137.508;
  const hue = (25 + index * goldenAngle) % 360;

  return `oklch(70% 0.20 ${hue.toFixed(2)})`;
}

export function stringColor(value: string) {
  let hash = 2166136261;

  for (const character of value.trim().toLocaleLowerCase()) {
    hash ^= character.codePointAt(0) || 0;
    hash = Math.imul(hash, 16777619);
  }

  const paletteIndex = (hash >>> 0) % 12;
  return participantColor(paletteIndex);
}

export function createParticipantColorMap(
  participants: readonly ColorParticipant[],
) {
  const colors = new Map<string, string>();

  for (const participant of participants) {
    if (participant.mergedInto) continue;
    colors.set(participant.id, participantColor(colors.size));
  }

  return colors;
}
