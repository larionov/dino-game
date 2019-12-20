import { writable } from "svelte/store";
export const count = writable(0);

export const posY = writable(-300);
export const posX = writable(-500);

export const isSettingsOpen = writable(false);

export const gravity = writable(10000);
export const jumpVector = writable(-2500);
export const frameLength = writable(0);
