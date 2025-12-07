const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};

export function ReportEmailTemplate({
  username,
  period,
  totalIncome,
  totalExpenses,
  availableBalance,
  savingsRate,
  topSpendingCategories,
  insights,
  frequency = "Monthly",
}) {
  const currentYear = new Date().getFullYear();
  const reportTitle = `${capitalizeFirstLetter(frequency)} Report`;

  // Create category list HTML
  const categoryList =
    topSpendingCategories
      ?.map(
        (cat) => `
      <li>
        ${cat._id || cat.name} - ${formatCurrency(cat.total || cat.amount)} ${cat.percent ? `(${cat.percent}%)` : ""}
      </li>
    `
      )
      .join("") || "";

  // Handle insights - if it's a string, wrap in li, if array, map to li
  const insightsList =
    typeof insights === "string"
      ? `<li>${insights}</li>`
      : insights?.map((insight) => `<li>${insight}</li>`).join("") || "";

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <title>{reportTitle}</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>

      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "'Roboto', Arial, sans-serif",
          backgroundColor: "#f7f7f7",
          fontSize: "16px",
        }}
      >
        <table
          cellPadding="0"
          cellSpacing="0"
          width="100%"
          style={{ backgroundColor: "#f7f7f7", padding: "20px" }}
        >
          <tr>
            <td>
              <table
                cellPadding="0"
                cellSpacing="0"
                width="100%"
                style={{
                  maxWidth: "600px",
                  margin: "auto",
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  overflow: "hidden",
                  boxShadow: "0 0 10px rgba(0,0,0,0.05)",
                }}
              >
                <tr>
                  <td
                    style={{
                      backgroundColor: "#00bc7d",
                      padding: "20px 30px",
                      color: "#ffffff",
                      textAlign: "center",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "24px",
                        textTransform: "capitalize",
                      }}
                    >
                      {reportTitle}
                    </h2>
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: "20px 30px" }}>
                    <p style={{ margin: "0 0 10px", fontSize: "16px" }}>
                      Hi <strong>{username}</strong>,
                    </p>
                    <p style={{ margin: "0 0 20px", fontSize: "16px" }}>
                      Here's your financial summary for{" "}
                      <strong>{period}</strong>.
                    </p>

                    <table width="100%" style={{ borderCollapse: "collapse" }}>
                      <tr>
                        <td style={{ padding: "8px 0", fontSize: "16px" }}>
                          <strong>Total Income:</strong>
                        </td>
                        <td style={{ textAlign: "right", fontSize: "16px" }}>
                          {formatCurrency(totalIncome)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "8px 0", fontSize: "16px" }}>
                          <strong>Total Expenses:</strong>
                        </td>
                        <td style={{ textAlign: "right", fontSize: "16px" }}>
                          {formatCurrency(totalExpenses)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "8px 0", fontSize: "16px" }}>
                          <strong>Available Balance:</strong>
                        </td>
                        <td style={{ textAlign: "right", fontSize: "16px" }}>
                          {formatCurrency(availableBalance)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "8px 0", fontSize: "16px" }}>
                          <strong>Savings Rate:</strong>
                        </td>
                        <td style={{ textAlign: "right", fontSize: "16px" }}>
                          {savingsRate.toFixed(2)}%
                        </td>
                      </tr>
                    </table>

                    <hr
                      style={{
                        margin: "20px 0",
                        border: "none",
                        borderTop: "1px solid #e0e0e0",
                      }}
                    />

                    <h4 style={{ margin: "0 0 10px", fontSize: "16px" }}>
                      Top Spending Categories
                    </h4>
                    <ul
                      style={{
                        paddingLeft: "20px",
                        margin: 0,
                        fontSize: "16px",
                      }}
                      dangerouslySetInnerHTML={{ __html: categoryList }}
                    />

                    <hr
                      style={{
                        margin: "20px 0",
                        border: "none",
                        borderTop: "1px solid #e0e0e0",
                      }}
                    />

                    <h4 style={{ margin: "0 0 10px", fontSize: "16px" }}>
                      Insights
                    </h4>
                    <ul
                      style={{
                        paddingLeft: "20px",
                        margin: 0,
                        fontSize: "16px",
                      }}
                      dangerouslySetInnerHTML={{ __html: insightsList }}
                    />

                    <p
                      style={{
                        marginTop: "30px",
                        fontSize: "13px",
                        color: "#888",
                      }}
                    >
                      This report was generated automatically based on your
                      recent activity.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td
                    style={{
                      backgroundColor: "#f0f0f0",
                      textAlign: "center",
                      padding: "15px",
                      fontSize: "12px",
                      color: "#999",
                    }}
                  >
                    &copy; {currentYear} Finara. All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "32px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#ffffff",
              marginBottom: "8px",
              letterSpacing: "-0.025em",
            }}
          >
            Finara
          </div>
          <div
            style={{
              fontSize: "16px",
              color: "rgba(255, 255, 255, 0.9)",
              fontWeight: "500",
            }}
          >
            {frequency} Financial Report
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "32px 24px" }}>
          {/* Greeting */}
          <div style={{ marginBottom: "28px" }}>
            <h2
              style={{
                margin: "0 0 8px 0",
                fontSize: "20px",
                fontWeight: "600",
                color: "#1e293b",
              }}
            >
              Hi {username},
            </h2>
            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: "16px",
              }}
            >
              Here's your financial summary for{" "}
              <strong style={{ color: "#1e293b" }}>{period}</strong>
            </p>
          </div>

          {/* Financial Summary Cards */}
          <div
            style={{
              display: "grid",
              gap: "16px",
              marginBottom: "32px",
            }}
          >
            {/* Income Card */}
            <div
              style={{
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                padding: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#15803d",
                    marginBottom: "4px",
                  }}
                >
                  Total Income
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#166534",
                  }}
                >
                  {formatCurrency(totalIncome)}
                </div>
              </div>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  backgroundColor: "#22c55e",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "20px",
                    color: "#ffffff",
                  }}
                >
                  ↗
                </span>
              </div>
            </div>

            {/* Expenses Card */}
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#dc2626",
                    marginBottom: "4px",
                  }}
                >
                  Total Expenses
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#991b1b",
                  }}
                >
                  {formatCurrency(totalExpenses)}
                </div>
              </div>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  backgroundColor: "#ef4444",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "20px",
                    color: "#ffffff",
                  }}
                >
                  ↘
                </span>
              </div>
            </div>

            {/* Balance Card */}
            <div
              style={{
                backgroundColor: availableBalance >= 0 ? "#f0f9ff" : "#fef2f2",
                border: `1px solid ${availableBalance >= 0 ? "#bae6fd" : "#fecaca"}`,
                borderRadius: "8px",
                padding: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: availableBalance >= 0 ? "#0369a1" : "#dc2626",
                    marginBottom: "4px",
                  }}
                >
                  Available Balance
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: availableBalance >= 0 ? "#0c4a6e" : "#991b1b",
                  }}
                >
                  {formatCurrency(availableBalance)}
                </div>
              </div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: availableBalance >= 0 ? "#0369a1" : "#dc2626",
                  backgroundColor:
                    availableBalance >= 0 ? "#e0f2fe" : "#fee2e2",
                  padding: "6px 12px",
                  borderRadius: "20px",
                }}
              >
                {savingsRate.toFixed(1)}% savings
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
