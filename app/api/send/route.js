import { ReportEmailTemplate } from "@/components/email-template";
import { Resend } from "resend";
import { NextResponse } from "next/server";
const resend = new Resend(process.env.RESEND_API_KEY);

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};

export const sendReportEmail = async (params) => {
  const { email, username, report, frequency } = params;

  console.log("Sending email to:", email);

  const mailer_sender = `Finara <${process.env.RESEND_MAILER_SENDER || "onboarding@resend.dev"}>`;
  
  const periodText = report.period?.from && report.period?.to 
    ? `${report.period.from} - ${report.period.to}` 
    : report.period;

  const text = `Your ${capitalizeFirstLetter(frequency)} Financial Report (${periodText})

Income: ${formatCurrency(report.totalIncome || report.summary?.totalIncome || 0)}
Expenses: ${formatCurrency(report.totalExpenses || report.summary?.totalExpense || 0)}
Balance: ${formatCurrency(report.availableBalance || report.summary?.availableBalance || 0)}
Savings Rate: ${(report.savingsRate || report.summary?.savingsRate || 0).toFixed(2)}%

${report.insights || "No insights available"}
`;

  return await resend.emails.send({
    from: mailer_sender,
    to: [email],
    subject: `${capitalizeFirstLetter(frequency)} Financial Report - ${periodText}`,
    text,
    react: ReportEmailTemplate({
      username,
      period: periodText,
      totalIncome: report.totalIncome || report.summary?.totalIncome || 0,
      totalExpense: report.totalExpenses || report.summary?.totalExpense || 0,
      availableBalance: report.availableBalance || report.summary?.availableBalance || 0,
      savingsRate: report.savingsRate || report.summary?.savingsRate || 0,
      topCategories: report.topSpendingCategories || report.topCategories || report.summary?.topCategories || [],
      insights: report.insights,
      frequency: capitalizeFirstLetter(frequency),
    }),
  });
};

export async function POST(request) {
  try {
    const { email, username, report, frequency = "monthly" } = await request.json();

    if (!email || !username || !report) {
      return NextResponse.json({ error: "Missing email, username, or report" }, { status: 400 });
    }

    const { data, error } = await sendReportEmail({ email, username, report, frequency });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json(data);
    
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
