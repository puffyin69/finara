import { ConnectDb } from "@/app/lib/Mongodb";
import { Transactions } from "@/models/Transaction";
import { User } from "@/models/User";

/**
 * Processes monthly reports
 * Runs on the first of every month at 2:30am UTC
 * Uses EXISTING database structure - no changes needed
 */
export async function processReportJob() {
  try {
    console.log("📊 Starting monthly report processing...");
    
    // Connect to database
    await ConnectDb();
    
    // Get previous month's data
    const now = new Date();
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    console.log(`📅 Generating reports for: ${firstDayOfPrevMonth.toISOString().split('T')[0]} to ${lastDayOfPrevMonth.toISOString().split('T')[0]}`);
    
    // Get all users
    const users = await User.find({});
    console.log(`👥 Processing reports for ${users.length} users`);
    
    let reportsGenerated = 0;
    let errorCount = 0;
    
    // Process each user
    for (const user of users) {
      try {
        // Get user's Transaction for previous month
        const userTransaction = await Transaction.find({
          userId: user._id,
          date: {
            $gte: firstDayOfPrevMonth,
            $lte: lastDayOfPrevMonth
          }
        });
        
        if (userTransactions.length > 0) {
          // Calculate monthly summary
          const monthlyReport = await generateMonthlyReport(user, userTransactions, firstDayOfPrevMonth, lastDayOfPrevMonth);
          
          // Here you could save the report to a Reports collection if you had one
          // For now, we'll just log it
          console.log(`✅ Generated report for user: ${user.email}`, {
            transactions: monthlyReport.totalTransactions,
            income: monthlyReport.totalIncome,
            expenses: monthlyReport.totalExpenses,
            balance: monthlyReport.netBalance
          });
          
          reportsGenerated++;
        } else {
          console.log(`⏭️ No transactions found for user: ${user.email}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing report for user ${user._id}:`, error);
        errorCount++;
      }
    }
    
    const result = {
      success: true,
      usersProcessed: users.length,
      reportsGenerated: reportsGenerated,
      errors: errorCount,
      month: firstDayOfPrevMonth.toISOString().split('T')[0],
      message: `Processed ${users.length} users, generated ${reportsGenerated} reports`
    };
    
    console.log("✅ Monthly report processing completed:", result);
    return result;
    
  } catch (error) {
    console.error("❌ Error in processReportJob:", error);
    return {
      success: false,
      error: error.message,
      date: new Date().toISOString().split('T')[0]
    };
  }
}

/**
 * Generate monthly report for a specific user
 */
async function generateMonthlyReport(user, transactions, startDate, endDate) {
  try {
    const report = {
      userId: user._id,
      userEmail: user.email,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      totalTransactions: transactions.length,
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      categoryBreakdown: {},
      paymentMethodBreakdown: {},
      transactionsByType: {
        INCOME: 0,
        EXPENSE: 0
      }
    };
    
    // Process each transaction
    transactions.forEach(transaction => {
      const amount = Math.abs(transaction.amount);
      
      // Calculate totals by type
      if (transaction.type === 'INCOME') {
        report.totalIncome += amount;
        report.transactionsByType.INCOME++;
      } else if (transaction.type === 'EXPENSE') {
        report.totalExpenses += amount;
        report.transactionsByType.EXPENSE++;
      }
      
      // Category breakdown
      if (transaction.category) {
        if (!report.categoryBreakdown[transaction.category]) {
          report.categoryBreakdown[transaction.category] = 0;
        }
        report.categoryBreakdown[transaction.category] += amount;
      }
      
      // Payment method breakdown
      if (transaction.paymentMethod) {
        if (!report.paymentMethodBreakdown[transaction.paymentMethod]) {
          report.paymentMethodBreakdown[transaction.paymentMethod] = 0;
        }
        report.paymentMethodBreakdown[transaction.paymentMethod] += amount;
      }
    });
    
    // Calculate net balance
    report.netBalance = report.totalIncome - report.totalExpenses;
    
    // Round to 2 decimal places
    report.totalIncome = Math.round(report.totalIncome * 100) / 100;
    report.totalExpenses = Math.round(report.totalExpenses * 100) / 100;
    report.netBalance = Math.round(report.netBalance * 100) / 100;
    
    return report;
    
  } catch (error) {
    console.error("Error generating monthly report:", error);
    throw error;
  }
}