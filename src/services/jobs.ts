type Job = () => Promise<void>;

const queue: Job[] = [];
let running = false;

export function enqueue(job: Job) {
  queue.push(job);
  processQueue();
}

async function processQueue() {
  if (running) return;
  running = true;
  while (queue.length) {
    const job = queue.shift();
    if (job) await job();
  }
  running = false;
}
