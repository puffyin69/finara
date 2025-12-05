import { NextResponse } from "next/server";
import { Transactions } from "@/models/Transaction";
import { auth } from "@/auth";
import { User } from "@/models/User";
import { ConnectDb } from "@/app/lib/Mongodb";
import { updateTransactionSchema } from "@/app/validators/validateTransaction";
import { calculateNextOccurrenceDate } from "@/app/utils/helper";
export async function GET(request, { params }) {
  try {
    await ConnectDb();
    const { id } = await params;
    console.log("Transaction ID:", id);
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Unauthorized - please login to continue" },
        { status: 401 }
      );
    }
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { message: "User not found in database" },
        { status: 404 }
      );
    }
    const transaction = await Transactions.findOne({
      _id: id,
      userId: user._id,
    });
    const transactionExists = await Transactions.findById(id);
    if (!transaction) {
      return NextResponse.json(
        {
          message: "Transaction not found for this ID",
          debug: {
            requestedId: id,
            userId: user._id.toString(),
            transactionExists: !!transactionExists,
            transactionUserId: transactionExists
              ? transactionExists.userId.toString()
              : null,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Transaction fetched successfully",
      transaction,
      email: session.user.email,
      id,
    });
  } catch (error) {
    console.log("Error in transaction ID route:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    await ConnectDb();

    const { id } = await params;
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Unauthorized - please login to continue" },
        { status: 401 }
      );
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { message: "User not found in database" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = updateTransactionSchema.parse(body);

    // Fetch the existing transaction
    const existingTransaction = await Transactions.findOne({
      _id: id,
      userId: user._id,
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { message: "Transaction not found for this ID" },
        { status: 404 }
      );
    }

    const now = new Date();
    const isRecurring =
      data.isRecurring !== undefined
        ? data.isRecurring
        : existingTransaction.isRecurring;

    const date =
      data.date !== undefined ? new Date(data.date) : existingTransaction.date;

    const recurringInterval =
      data.recurringInterval || existingTransaction.recurringInterval;

    let nextRecurringDate = existingTransaction.nextRecurringDate;

    if (isRecurring && recurringInterval) {
      const calculated = calculateNextOccurrenceDate(date, recurringInterval);

      nextRecurringDate =
        calculated < now
          ? calculateNextOccurrenceDate(now, recurringInterval)
          : calculated;
    }

    // Apply partial field updates
    existingTransaction.set({
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
      ...(data.category && { category: data.category }),
      ...(data.type && { type: data.type }),
      ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
      ...(data.amount !== undefined && { amount: Number(data.amount) }),

      date,
      isRecurring,
      recurringInterval,
      nextRecurringDate,
    });

    await existingTransaction.save();

    return NextResponse.json({
      message: "Transaction updated successfully",
      transaction: existingTransaction,
    });
  } catch (error) {
    console.log("Error updating transaction:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await ConnectDb();
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Unauthorized - please login to continue" },
        { status: 401 }
      );
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { message: "User not found in database" },
        { status: 404 }
      );
    }

    let result = await Transactions.findByIdAndDelete(id);
    if(!result){
      return NextResponse.json({
        message: "Transaction not found for this ID",
      },{status:404})
    }else{
      return NextResponse.json({
        message: "Transaction deleted successfully",
      },{status:200})
    }
  } catch (error) {
    return NextResponse.json(
      {
        message: "Internal Server Error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

