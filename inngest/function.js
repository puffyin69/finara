import {inngest} from "./client.js";
import { processRecurringTransactions } from "@/jobs/transaction.job";
import { processReportJob } from "@/jobs/report.job";

export const recurringTransactionCreated = inngest.createFunction(
    {
      id: 'recurring-transaction-created', 
      name: 'Recurring Transaction Created Handler'
    },
    { event: 'transactions/recurring.created' },
    async({ event, step }) => {
        console.log("✅ Recurring Transaction Created Function Triggered!");
        await step.sleep("Processing new recurring transaction...", 1000);
        return { success: true, message: "Recurring transaction setup completed" };
    }
);

// ⏰ SERVERLESS CRON: Daily Transactions Job (Replaces node-cron)
// Equivalent to: scheduleJob("Transactions", "5 0 * * *", processRecurringTransactions)
export const dailyTransactionsCron = inngest.createFunction(
  {
    id: "daily-transactions-cron",
    name: "Daily Transactions Job",
  },
  {
    cron: "5 0 * * *" // Every day at 00:05 UTC
  },
  async ({ step }) => {
    console.log("Scheduling Transactions at 5 0 * * *");

    const result = await step.run(
      "process-transactions", 
      async () => {
        try {
          await processRecurringTransactions();
          console.log("Transactions completed");
          return { success: true, job: "Transactions" };
        } catch (error) {
          console.log("Transactions failed", error);
          throw error;
        }
      }
    );

    return result;
  }
);

// ⏰ SERVERLESS CRON: Monthly Reports Job (Replaces node-cron)  
// Equivalent to: scheduleJob("Reports", "30 2 1 * *", processReportJob)
export const monthlyReportsCron = inngest.createFunction(
  {
    id: "monthly-reports-cron",
    name: "Monthly Reports Job",
  },
  {
    cron: "30 2 1 * *" // 2:30am every first of the month
  },
  async ({ step }) => {
    console.log("Scheduling Reports at 30 2 1 * *");

    const result = await step.run(
      "process-reports", 
      async () => {
        try {
          await processReportJob();
          console.log("Reports completed");
          return { success: true, job: "Reports" };
        } catch (error) {
          console.log("Reports failed", error);
          throw error;
        }
      }
    );

    return result;
  }
);

export const functions = [
  recurringTransactionCreated,
  dailyTransactionsCron,    
  monthlyReportsCron         
];