

const USER_PALETTE = [
  '#5b7185',
  '#7c8b6f',
  '#c9762e',
  '#a4563f',
  '#8f6b8a',
  '#3f7a7a',
  '#94806e',
  '#6d5d8f',
];

const MEMBER_PALETTE = ['#c9762e', '#7c8b6f', '#a4563f', '#5b7185'];

export function pickUserColor(): string {
  return USER_PALETTE[Math.floor(Math.random() * USER_PALETTE.length)];
}


export function pickMemberColor(takenColors: readonly string[]): string {
  const free = MEMBER_PALETTE.find((color) => !takenColors.includes(color));
  return free ?? MEMBER_PALETTE[takenColors.length % MEMBER_PALETTE.length];
}
