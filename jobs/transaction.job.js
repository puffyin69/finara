import { ConnectDb } from "@/app/lib/Mongodb";
import { Transactions } from "@/models/Transaction";
import { User } from "@/models/User";
export async function processRecurringTransactions() {
  try {
    console.log("🔄 Starting recurring Transactions processing...");
    
    // Connect to database
    await ConnectDb();
    
    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Processing recurring Transactions for: ${today}`);
    
    // Find all recurring Transactions that are due today
    // This is a simplified version - you can make it more complex based on frequency
    const recurringTransactions = await Transaction.find({
      isRecurring: true,
      recurringFrequency: { $exists: true },
      // Add logic to check if Transaction should be created today
      // For now, we'll process all recurring Transactions as an example
    }).populate('userId', 'email name');
    
    console.log(`📊 Found ${recurringTransactions.length} recurring Transactions to process`);
    
    let createdCount = 0;
    let errorCount = 0;
    
    // Process each recurring Transaction
    for (const recurringTransaction of recurringTransactions) {
      try {
        // Check if we should create this Transaction today
        // This is a simple example - you can add more complex logic
        const shouldCreate = await shouldCreateRecurringTransaction(recurringTransaction, today);
        
        if (shouldCreate) {
          // Create a new Transaction based on the recurring template
          const newTransaction = new Transaction({
            userId: recurringTransaction.userId._id,
            title: recurringTransaction.title,
            type: recurringTransaction.type,
            amount: recurringTransaction.amount,
            category: recurringTransaction.category,
            date: today,
            description: `${recurringTransaction.description} (Auto-created from recurring Transaction)`,
            paymentMethod: recurringTransaction.paymentMethod,
            isRecurring: false, // This is the actual Transaction, not the template
            recurringParentId: recurringTransaction._id, // Reference to the recurring template
          });
          
          await newTransaction.save();
          createdCount++;
          
          console.log(`✅ Created Transaction: ${newTransaction.title} for user: ${recurringTransaction.userId.email}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing recurring Transaction ${recurringTransaction._id}:`, error);
        errorCount++;
      }
    }
    
    const result = {
      success: true,
      processed: recurringTransactions.length,
      created: createdCount,
      errors: errorCount,
      date: today,
      message: `Processed ${recurringTransactions.length} recurring Transactions, created ${createdCount} new Transactions`
    };
    
    console.log("✅ Recurring Transactions processing completed:", result);
    return result;
    
  } catch (error) {
    console.error("❌ Error in processRecurringTransactions:", error);
    return {
      success: false,
      error: error.message,
      date: new Date().toISOString().split('T')[0]
    };
  }
}


async function shouldCreateRecurringTransaction(recurringTransaction, today) {
  try {
    // Simple example: check if we already created this Transaction today
    const existingToday = await Transaction.findOne({
      recurringParentId: recurringTransaction._id,
      date: today
    });
    
    if (existingToday) {
      console.log(`⏭️ Transaction already created today for: ${recurringTransaction.title}`);
      return false;
    }
    
    // Add your recurring frequency logic here
    // For example:
    // - Daily: create every day
    // - Weekly: create on specific day of week
    // - Monthly: create on specific day of month
    // - Yearly: create on specific date
    
    switch (recurringTransaction.recurringFrequency) {
      case 'DAILY':
        return true; // Create every day
        
      case 'WEEKLY':
        // Example: create on the same day of week as the original Transaction
        const originalDate = new Date(recurringTransaction.recurringStartDate || recurringTransaction.date);
        const todayDate = new Date(today);
        return originalDate.getDay() === todayDate.getDay();
        
      case 'MONTHLY':
        // Example: create on the same day of month
        const originalDay = new Date(recurringTransaction.recurringStartDate || recurringTransaction.date).getDate();
        const todayDay = new Date(today).getDate();
        return originalDay === todayDay;
        
      default:
        return false;
    }
    
  } catch (error) {
    console.error("Error in shouldCreateRecurringTransaction:", error);
    return false;
  }
}