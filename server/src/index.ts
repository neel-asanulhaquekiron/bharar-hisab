import "dotenv/config";
import { app } from "./app";
import { startReminderJob } from "./jobs/reminders";

const port = Number(process.env.PORT) || 4000;

app.listen(port, () => {
  console.log(`ভাড়ার হিসাব API listening on http://localhost:${port}`);
  startReminderJob();
});
