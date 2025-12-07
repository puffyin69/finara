import { ConnectDb } from "@/app/lib/Mongodb";
import ReportSetting from "@/models/reportSetting";
import { generateReportService, calculateNextReportDate } from "@/app/utils/helper";
import { sendReportEmail } from "@/app/api/send/route";
import mongoose from "mongoose";
import Report from "@/models/reports";
export async function processReportJob() {
  try {
    await ConnectDb();
    let processedCount = 0;
    let errorCount = 0;
    const mongoSession = await mongoose.startSession();
    const now = new Date();
    const firstDayOfPrevMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );
    const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const reportCursor = ReportSetting.find({
      isEnabled: true,
      nextReportDate: { $lte: now },
    })
      .populate("userId")
      .cursor();

    console.log("Processing due reports...");

    for await (const setting of reportCursor) {
      const user = setting.userId;
      if (!user) {
        console.log("User not found for setting:", setting._id);
        continue;
      }

      let reportData = null;
      try {
        reportData = await generateReportService(
          user._id,
          firstDayOfPrevMonth,
          lastDayOfPrevMonth
        );
      } catch (err) {
        console.log("Report generation failed:", err);
      }

      let emailSent = false;
      if (reportData) {
        try {
          await sendReportEmail({
            email: user.email,
            username: user.name,
            report: {
              period: reportData.period?.from && reportData.period?.to 
                ? `${reportData.period.from} - ${reportData.period.to}` 
                : reportData.period,
              totalIncome: reportData.summary?.totalIncome || reportData.totalIncome || 0,
              totalExpenses: reportData.summary?.totalExpense || reportData.totalExpenses || 0,
              availableBalance: reportData.summary?.availableBalance || reportData.availableBalance || 0,
              savingsRate: reportData.summary?.savingsRate || reportData.savingsRate || 0,
              topSpendingCategories: reportData.summary?.topCategories || reportData.topCategories || [],
              insights: reportData.insights,
            },
            frequency: setting.frequency,
          });
          emailSent = true;
          console.log(`Email sent successfully to ${user.email}`);
        } catch (error) {
          console.log(`Email failed for ${user.email}:`, error.message);
          emailSent = false;
        }
      }

      try {
        await mongoSession.withTransaction(async () => {
          const bulkReports = [];
          const bulkSettings = [];

          if (reportData && emailSent) {
            bulkReports.push({
              insertOne: {
                document: {
                  userId: user._id,
                  sentDate: now,
                  period: reportData.period,
                  status: "SENT",
                  createdAt: now,
                  updatedAt: now,
                },
              },
            });

            bulkSettings.push({
              updateOne: {
                filter: { _id: setting._id },
                update: {
                  $set: {
                    lastSentDate: now,
                    nextReportDate: calculateNextReportDate(now),
                    updatedAt: now,
                  },
                },
              },
            });
          } else {
            bulkReports.push({
              insertOne: {
                document: {
                  userId: user._id,
                  sentDate: now,
                  period:
                    reportData?.period ||
                    `${firstDayOfPrevMonth.toISOString().split("T")[0]} to ${
                      lastDayOfPrevMonth.toISOString().split("T")[0]
                    }`,
                  status: reportData ? "FAILED" : "NO_ACTIVITY",
                  createdAt: now,
                  updatedAt: now,
                },
              },
            });

            bulkSettings.push({
              updateOne: {
                filter: { _id: setting._id },
                update: {
                  $set: {
                    lastSentDate: null,
                    nextReportDate: calculateNextReportDate(now),
                    updatedAt: now,
                  },
                },
              },
            });
          }

          await Promise.all([
            Report.bulkWrite(bulkReports, {
              session: mongoSession,
              ordered: false,
            }),
            ReportSetting.bulkWrite(bulkSettings, {
              session: mongoSession,
              ordered: false,
            }),
          ]);
        });
      } catch (Error) {
        console.error("Transaction failed for user:", user._id, Error.message);
      }
    }

    await mongoSession.endSession();
    console.log("Report cron job completed successfully")

    processedCount++;
    return { success: true };
  } catch (error) {
    console.error("Error in processReportJob:", error.message);
    errorCount++;
    
    return {
      success: false,
      error: error.message,
    };
  }
}

async function generateMonthlyReport(user, transactions, startDate, endDate) {
  try {
    const report = {
      userId: user._id,
      userEmail: user.email,
      period: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      },
      totalTransactions: transactions.length,
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      categoryBreakdown: {},
      paymentMethodBreakdown: {},
      transactionsByType: {
        INCOME: 0,
        EXPENSE: 0,
      },
    };

    transactions.forEach((transaction) => {
      const amount = Math.abs(transaction.amount);

      if (transaction.type === "INCOME") {
        report.totalIncome += amount;
        report.transactionsByType.INCOME++;
      } else if (transaction.type === "EXPENSE") {
        report.totalExpenses += amount;
        report.transactionsByType.EXPENSE++;
      }

      if (transaction.category) {
        if (!report.categoryBreakdown[transaction.category]) {
          report.categoryBreakdown[transaction.category] = 0;
        }
        report.categoryBreakdown[transaction.category] += amount;
      }

      if (transaction.paymentMethod) {
        if (!report.paymentMethodBreakdown[transaction.paymentMethod]) {
          report.paymentMethodBreakdown[transaction.paymentMethod] = 0;
        }
        report.paymentMethodBreakdown[transaction.paymentMethod] += amount;
      }
    });

    report.netBalance = report.totalIncome - report.totalExpenses;
    report.totalIncome = Math.round(report.totalIncome * 100) / 100;
    report.totalExpenses = Math.round(report.totalExpenses * 100) / 100;
    report.netBalance = Math.round(report.netBalance * 100) / 100;
    return report;
  } catch (error) {
    console.error("Error generating monthly report:", error);
    throw error;
  }
}
