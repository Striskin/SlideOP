// Keep thumbnail rendering from allocating a canvas for every page at once.
let running = 0;
const queue: (() => void)[] = [];
export function queueThumbnail<T>(
  render: () => Promise<T>,
  cancelled: () => boolean,
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const task = () => {
      if (cancelled()) {
        resolve(undefined);
        next();
        return;
      }
      running++;
      void render()
        .then(resolve, reject)
        .finally(() => {
          running--;
          next();
        });
    };
    const next = () => {
      if (running < 2) queue.shift()?.();
    };
    queue.push(task);
    next();
  });
}
