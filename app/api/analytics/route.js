import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ConnectDb } from "@/app/lib/Mongodb";
import { User } from "@/models/User";
import mongoose from "mongoose";
import { Transactions } from "@/models/Transaction";

const dateRangeEnums = {
  LAST_30_DAYS: "30days",
  LAST_MONTH: "lastMonth",
  LAST_3_MONTHS: "3months",
  LAST_6_MONTHS: "6months",
  LAST_YEAR: "1year",
  ALL_TIME: "allTime",
  CUSTOM: "custom",
};

export function getDateRange(preset) {
  const now = new Date();
  let fromDate, toDate;
  switch (preset) {
    case dateRangeEnums.LAST_30_DAYS:
      fromDate = new Date();
      fromDate.setDate(now.getDate() - 30);
      toDate = now;
      break;
    case dateRangeEnums.LAST_MONTH:
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      toDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case dateRangeEnums.LAST_3_MONTHS:
      fromDate = new Date();
      fromDate.setMonth(now.getMonth() - 3);
      toDate = now;
      break;
    case dateRangeEnums.LAST_6_MONTHS:
      fromDate = new Date();
      fromDate.setMonth(now.getMonth() - 6);
      toDate = now;
      break;
    case dateRangeEnums.LAST_YEAR:
      fromDate = new Date();
      fromDate.setFullYear(now.getFullYear() - 1);
      toDate = now;
      break;
    case dateRangeEnums.ALL_TIME:
      fromDate = new Date(0);
      toDate = now;
      break;
    case dateRangeEnums.CUSTOM:
      return null;
    default:
      throw new Error("Invalid date range preset");
  }
  return { fromDate, toDate };
}

function calculatePercentageChange(previous, current) {
  if (previous === 0) return current === 0 ? 0 : 100;
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return parseFloat(Math.min(Math.max(change, -100), 100).toFixed(2));
}

export async function GET(request, { params }) {
  try {
    await ConnectDb();
    const session = await auth();

    if (!session.user.email) {
      return NextResponse.json(
        {
          message: "Not authorised! Please Login to continue",
        },
        { status: 401 }
      );
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        {
          message: "No user found!",
        },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const preset = searchParams.get("preset") || dateRangeEnums.LAST_30_DAYS;

    let fromDate, toDate;

    if (preset === dateRangeEnums.CUSTOM) {
      if (!from || !to) {
        return NextResponse.json(
          {
            message: "Missing required parameters: from and to dates",
          },
          { status: 400 }
        );
      }
      fromDate = new Date(from);
      toDate = new Date(to);
      
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return NextResponse.json(
          {
            message: "Invalid date format. Use YYYY-MM-DD",
          },
          { status: 400 }
        );
      }
      
      if (fromDate > toDate) {
        return NextResponse.json(
          {
            message: "Invalid Date Range given",
          },
          { status: 400 }
        );
      }
      
      toDate.setHours(23, 59, 59, 999);
    } else {
      const range = getDateRange(preset);
      if (!range) {
        return NextResponse.json(
          {
            message: "Invalid date range preset",
          },
          { status: 400 }
        );
      }
      fromDate = range.fromDate;
      toDate = range.toDate;
    }

    const currentPeriod = [
      {
        $match: {
          userId: new mongoose.Types.ObjectId(user._id),
          ...(fromDate && toDate
            ? {
                date: {
                  $gte: fromDate,
                  $lte: toDate,
                },
              }
            : {}),
        },
      },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: {
              $cond: [{ $eq: ["$type", "INCOME"] }, { $abs: "$amount" }, 0],
            },
          },
          totalExpense: {
            $sum: {
              $cond: [
                { $eq: ["$type", "EXPENSE"] },
                { $abs: "$amount" },
                0,
              ],
            },
          },
          transactionCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          totalIncome: 1,
          totalExpense: 1,
          transactionCount: 1,
          availableBalance: {
            $subtract: ["$totalIncome", "$totalExpense"],
          },
          savingData: {
            $let: {
              vars: {
                income: { $ifNull: ["$totalIncome", 0] },
                expense: { $ifNull: ["$totalExpense", 0] },
              },
              in: {
                // (totalIncome - totalExpense) / totalIncome * 100
                savingsPercent: {
                  $cond: [
                    { $lte: ["$$income", 0] },
                    0,
                    {
                      $multiply: [
                        {
                          $divide: [
                            { $subtract: ["$$income", "$$expense"] },
                            "$$income",
                          ],
                        },
                        100,
                      ],
                    },
                  ],
                },
                // Expense Ratio: (expense / income) * 100
                expenseRatio: {
                  $cond: [
                    { $lte: ["$$income", 0] },
                    0,
                    {
                      $multiply: [
                        { $divide: ["$$expense", "$$income"] },
                        100,
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      },
    ];

    const [current] = await Transactions.aggregate(currentPeriod);

    const {
      totalIncome = 0,
      totalExpense = 0,
      transactionCount = 0,
      availableBalance = 0,
      savingData: { savingsPercent = 0, expenseRatio = 0 } = {},
    } = current || {};

    let percentChange = {
      income: 0,
      expense: 0,
      balance: 0,
      prevPeriodFrom: null,
      prevPeriodTo: null,
      previousValues: {
        incomeAmount: 0,
        expenseAmount: 0,
        balanceAmount: 0,
      },
    };
    
    if (fromDate && toDate && preset !== dateRangeEnums.ALL_TIME) {
      const period = Math.floor((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
      const prevPeriodFrom = new Date(fromDate);
      prevPeriodFrom.setDate(prevPeriodFrom.getDate() - period);
      const prevPeriodTo = new Date(toDate);
      prevPeriodTo.setDate(prevPeriodTo.getDate() - period);

      const previousPeriod = [
        {
          $match: {
            userId: new mongoose.Types.ObjectId(user._id),
            date: {
              $gte: prevPeriodFrom,
              $lte: prevPeriodTo,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalIncome: {
              $sum: {
                $cond: [{ $eq: ["$type", "INCOME"] }, { $abs: "$amount" }, 0],
              },
            },
            totalExpense: {
              $sum: {
                $cond: [{ $eq: ["$type", "EXPENSE"] }, { $abs: "$amount" }, 0],
              },
            },
          },
        },
      ];

      const [previous] = await Transactions.aggregate(previousPeriod);

      if (previous) {
        const prevIncome = previous.totalIncome || 0;
        const prevExpense = previous.totalExpense || 0;
        const prevBalance = prevIncome - prevExpense;

        percentChange = {
          income: calculatePercentageChange(prevIncome, totalIncome),
          expense: calculatePercentageChange(prevExpense, totalExpense),
          balance: calculatePercentageChange(prevBalance, availableBalance),
          prevPeriodFrom,
          prevPeriodTo,
          previousValues: {
            incomeAmount: prevIncome,
            expenseAmount: prevExpense,
            balanceAmount: prevBalance,
          },
        };
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          availableBalance,
          totalIncome,
          totalExpense,
          savingRate: {
            percentage: parseFloat(savingsPercent.toFixed(2)),
            expenseRatio: parseFloat(expenseRatio.toFixed(2)),
          },
          transactionCount,
          percentChange,
          preset: {
            value: preset,
            from: fromDate,
            to: toDate,
          },
        },  
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Analytics API Error:", error);
    return NextResponse.json(
      {
        message: "Internal Server Error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}