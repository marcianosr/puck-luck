import { H, W } from '@/data/constants';

// Above 2× the extra sharpness is invisible on flat disc graphics, but 3× screens would fill 2.25× the pixels every frame.
const MAX_DPR = 2;

/** Keeps the canvas as large as its stage allows at the rink's aspect ratio, sharp on high-DPI screens. */
export function fitCanvas(canvas: HTMLCanvasElement, stage: HTMLElement, ctx: CanvasRenderingContext2D): () => number {
  let scale = 1;
  const fit = () => {
    const box = stage.getBoundingClientRect();
    scale = Math.min(box.width / W, box.height / H);
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.style.width = `${W * scale}px`;
    canvas.style.height = `${H * scale}px`;
    canvas.width = W * scale * dpr;
    canvas.height = H * scale * dpr;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  };
  new ResizeObserver(fit).observe(stage);
  fit();
  return () => scale;
}
