// Spreads the 3D model's set-up over the page's spare time, so it can start during the
// preloader and finish after the intro without any one moment of it being noticeable.
//
// pause(): between steps. In the background it waits for an idle gap between frames; once the
//   visitor gets close to the section (hurry()), it just yields so the model is ready fast.
// calm(): before the few steps that can't be cut up (shader linking, the first frame). Waits
//   until the intro and perf.js's frame-rate check are over, or until hurry().

let urgent = false;
let onHurry;
const hurried = new Promise((r) => (onHurry = r));

export function hurry() {
  urgent = true;
  onHurry();
}

const idle = window.requestIdleCallback
  ? (r) => requestIdleCallback(() => r(), { timeout: 1000 })
  : (r) => setTimeout(r, 50);
const yieldNow = () =>
  window.scheduler && window.scheduler.yield ? window.scheduler.yield() : new Promise((r) => setTimeout(r, 0));

export const pause = () => (urgent ? yieldNow() : new Promise(idle));

export const calm = () => Promise.race([hurried, window.perf ? window.perf.settled : Promise.resolve()]);
