import { writable } from "svelte/store";
export const count = writable(0);

export const posY = writable(-300);
export const posX = writable(0);

export const isSettingsOpen = writable(false);

export const gravity = writable(-1);
export const jumpVector = writable(20);
export const frameLength = writable(0);
export const speedX = writable(8);
export const width = writable(100);
export const height = writable(100);
export const gameStarted = writable(false);
