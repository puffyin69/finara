import { NextResponse } from "next/server";
import { Transactions } from "@/models/Transaction";
import { User } from "@/models/User";
import { createTransactionSchema } from "../../../validators/validateTransaction";
import { calculateNextOccurrenceDate } from "../../../utils/helper";
import { ConnectDb } from "../../../lib/Mongodb";
import { auth } from "@/auth";

export async function POST(request) {
  try {
    await ConnectDb();
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { message: "Unauthorized. Please login to continue." },
        { status: 401 }
      );
    }

    // Get authenticated user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { message: "User not found in database" },
        { status: 404 }
      );
    }

    const userId = user._id;

    const body = await request.json();
    const data = createTransactionSchema.parse(body);

    const baseDate = new Date(data.date);
    if (isNaN(baseDate.getTime())) {
      return NextResponse.json(
        { message: "Invalid date format provided" },
        { status: 400 }
      );
    }

    let nextRecurringDate = null;
    const currentDate = new Date();

    if (data.isRecurring && data.recurringInterval) {
      const calculatedDate = calculateNextOccurrenceDate(
        baseDate,
        data.recurringInterval
      );

      if (isNaN(calculatedDate.getTime())) {
        nextRecurringDate = null;
      } else {
        nextRecurringDate =
          calculatedDate < currentDate
            ? calculateNextOccurrenceDate(currentDate, data.recurringInterval)
            : calculatedDate;
      }
    }

    const transaction = await Transactions.create({
      ...data,
      userId,
      category: data.category || null,
      amount: Number(data.amount),
      isRecurring: data.isRecurring || false,
      recurringInterval: data.recurringInterval || null,
      nextRecurringDate,
      lastProcessed: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        message: "Transaction created successfully",
        data: transaction,
      },
      { status: 201 }
    );
  } catch (error) {
    console.log("Error:", error);
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
