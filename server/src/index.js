import { createApp } from './app.js';
import { startNightlyJob, runSnapshots } from './cron.js';

const port = Number(process.env.PORT || 3000);
createApp().listen(port, () => {
  console.log(`wheel server listening on :${port}`);
  if (process.env.RUN_SNAPSHOT_NOW === '1') runSnapshots();
  startNightlyJob();
});
