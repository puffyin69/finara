import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ConnectDb } from "@/app/lib/Mongodb";
import { User } from "@/models/User";
import { Transactions } from "@/models/Transaction";
import { getDateRange } from "../route";
const dateRangeEnums = {
  LAST_30_DAYS: "30days",
  LAST_MONTH: "lastMonth",
  LAST_3_MONTHS: "3months",
  LAST_6_MONTHS: "6months",
  LAST_YEAR: "1year",
  ALL_TIME: "allTime",
  CUSTOM: "custom",
};

export async function GET(request) {
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

    const filter = {
      userId: user._id  ,
      ...(fromDate && toDate
        ? {
            date: {
              $gte: fromDate,
              $lte: toDate,
            },
          }
        : {}),
    };

    const chartPipeline = [
      { $match: filter },
      // Group transactions by date (YYYY-MM-DD format)
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
            },
          },
          income: {
            $sum: {
              $cond: [{ $eq: ["$type", "INCOME"] }, { $abs: "$amount" }, 0],
            },
          },
          expenses: {
            $sum: {
              $cond: [{ $eq: ["$type", "EXPENSE"] }, { $abs: "$amount" }, 0],
            },
          },
          incomeCount: {
            $sum: {
              $cond: [{ $eq: ["$type", "INCOME"] }, 1, 0],
            },
          },
          expenseCount: {
            $sum: {
              $cond: [{ $eq: ["$type", "EXPENSE"] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          income: 1,
          expenses: 1,
          incomeCount: 1,
          expenseCount: 1,
        },
      },
      {
        $group: {
          _id: null,
          chartData: { $push: "$$ROOT" },
          totalIncomeCount: { $sum: "$incomeCount" },
          totalExpenseCount: { $sum: "$expenseCount" },
        },
      },
      {
        $project: {
          _id: 0,
          chartData: 1,
          totalIncomeCount: 1,
          totalExpenseCount: 1,
        },
      },
    ];

    const result = await Transactions.aggregate(chartPipeline);
    const resultData = result[0] || {
      chartData: [],
      totalIncomeCount: 0,
      totalExpenseCount: 0,
    };

    const transformedData = (resultData.chartData || []).map((item) => ({
      date: item.date,
      income: item.income,
      expenses: item.expenses,
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          chartData: transformedData,
          totalIncomeCount: resultData.totalIncomeCount || 0,
          totalExpenseCount: resultData.totalExpenseCount || 0,
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
    return NextResponse.json(
      {
        message: "Internal Server Error",
        error:error.message
      },
      { status: 500 }
    );
  }
}
