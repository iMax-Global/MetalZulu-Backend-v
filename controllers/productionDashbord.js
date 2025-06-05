const { Client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");
const { query } = require("express");

exports.getDashboard = wrapper(async (req, res, next) => {
  // console.log("manoj");
  const client = req.dbConnection;

  const TotalSaudaMonthly = await client.query(
    `select coalesce(sum(d.quantity),0) count
    from SL_STOCK_STATUS_HDR h,SL_STOCK_STATUS_DET d where h.ssh_code=d.ssh_code
    and h.marked is null and d.marked is null and h.company_code =${req.user.company}
    and h.unit_code=${req.user.unit} AND h.stock_date
    BETWEEN current_date::date - INTERVAL '30 days' AND current_date`
  );

  const TotalSaudaMonthlyValue = TotalSaudaMonthly.rows[0].count;

  const TotalSaudaYearly = await client.query(
    `select coalesce(sum(d.quantity),0) count
    from SL_STOCK_STATUS_HDR h,SL_STOCK_STATUS_DET d where  h.ssh_code=d.ssh_code
    and h.marked is null and d.marked is null and h.company_code =${req.user.company}
    and h.unit_code=${req.user.unit} AND h.stock_date
    BETWEEN current_date::date - INTERVAL '1 year' AND current_date`
  );

  const TotalSaudaYearlyValue = TotalSaudaYearly.rows[0].count;

  const TotalPendingSauda = await client.query(
    `SELECT count(*)
    FROM sl_trans_sauda_hdr h
    WHERE h.marked IS NULL
      AND h.company_code = ${req.user.company}
      AND h.unit_code = ${req.user.unit}
      AND h.fin_year = '${req.user.finyear}'
      AND coalesce(h.sauda_code,'A') NOT IN (
          SELECT coalesce(sauda_code,'A')
          FROM sl_trans_booking_hdr
          WHERE marked IS NULL
            AND company_code = ${req.user.company}
            AND unit_code = ${req.user.unit}
      )`
  );

  const TotalPendingSaudaValue = TotalPendingSauda.rows[0].count;

  const TotalMonthlyOrder = await client.query(
    `select coalesce(sum(d.qty),0) count
    from prod_exec_hdr h,PROD_EXEC_PRODUCT_DET d where h.exec_code=d.exec_cd
    and h.marked is null and d.marked is null and h.company_code =${req.user.company}
    and h.unit_code=${req.user.unit} AND h.exec_date 
    BETWEEN current_date::date - INTERVAL '30 days' AND current_date`
  );

  const TotalMonthlyOrderValue = TotalMonthlyOrder.rows[0].count;

  const TotalYearlyOrder = await client.query(
    `select coalesce(sum(d.qty),0) count
    from prod_exec_hdr h,PROD_EXEC_PRODUCT_DET d where h.exec_code=d.exec_cd
    and h.marked is null and d.marked is null and h.company_code =${req.user.company}
    and h.unit_code= ${req.user.unit} AND h.exec_date  BETWEEN current_date::date - INTERVAL '1 year' AND current_date`
  );

  const TotalYearlyOrderValue = TotalYearlyOrder.rows[0].count;

  const TotalPendingOrder = await client.query(
    `SELECT count(*)
    FROM sl_trans_booking_hdr
    WHERE marked IS NULL
      AND company_code =${req.user.company}
      AND unit_code =  ${req.user.unit}
     and coalesce(booking_code,'A') not in (select coalesce(booking_NO,'A') from sl_trans_invoice_hdr where marked is null and unit_code= ${req.user.unit}
     and company_code=${req.user.company})`
  );

  const TotalPendingOrderValue = TotalPendingOrder.rows[0].count;

  const TotalInvoiceMonthly = await client.query(
    `select count(*) from BREAKDOWN_FEEDING_HDR where marked is null and company_code=${req.user.company} and unit_code=${req.user.unit}
    AND feeding_date  BETWEEN current_date::date - INTERVAL '30 days' AND current_date`
  );

  const TotalInvoiceMonthlyValue = TotalInvoiceMonthly.rows[0].count;

  const TotalInvoiceYearly = await client.query(
    `select count(*) from BREAKDOWN_FEEDING_HDR where marked is null and company_code=${req.user.company} and unit_code=${req.user.company}
    AND feeding_date  BETWEEN current_date::date - INTERVAL '1 year' AND current_date`
  );

  const TotalInvoiceYearlyValue = TotalInvoiceYearly.rows[0].count;

  const allItemWithAmount = await client.query(
    `SELECT  get_item(item_code) AS item, SUM(total_qty) AS qty, sum(amount2) AS amount
    FROM 
        sl_trans_inv_size_detail 
    WHERE 
        marked IS NULL  AND company_code = ${req.user.company} AND unit_code = ${req.user.unit}
    GROUP BY 
        item_code 
    LIMIT 5;`
  );
  const formattedData = allItemWithAmount.rows.map((row) => ({
    ...row,

    qty: Number(row.qty), // Convert qty to number
    amount: Number(row.amount), // Convert amount to number
  }));

  const allSizeWithAmount = await client.query(
    `SELECT  get_size(size_code) AS size, SUM(total_qty) AS qty , sum(amount2) AS amount
    FROM 
        sl_trans_inv_size_detail 
    WHERE 
        marked IS NULL  AND company_code = ${req.user.company} AND unit_code = ${req.user.unit}
    GROUP BY 
        size_code 
    LIMIT 5;`
  );
  const formattedDataSize = allSizeWithAmount.rows.map((row) => ({
    ...row,

    qty: Number(row.qty), // Convert qty to number
    amount: Number(row.amount), // Convert amount to number
  }));

  const allGradeWithAmount = await client.query(
    `SELECT  get_quality(quality_code) AS grade, SUM(total_qty) AS qty , sum(amount2) AS amount
    FROM 
        sl_trans_inv_size_detail 
    WHERE 
        marked IS NULL  AND company_code = ${req.user.company} AND unit_code = ${req.user.unit}
    GROUP BY 
        quality_code 
    LIMIT 5;`
  );
  const formattedDataGrade = allGradeWithAmount.rows.map((row) => ({
    ...row,

    qty: Number(row.qty), // Convert qty to number
    amount: Number(row.amount), // Convert amount to number
  }));

  const allCustomerWithAmount = await client.query(
    `SELECT  get_distributor(h.distributor_code) AS customer, SUM(d.total_qty) AS qty , sum(amount2) AS amount
    FROM 
        sl_trans_invoice_hdr h, sl_trans_inv_size_detail D
    WHERE 
        h.marked IS NULL and d.marked is null  AND h.company_code = ${req.user.company} AND h.unit_code = ${req.user.unit} and h.invoice_no=d.invoice_no
    GROUP BY 
        h.distributor_code 
    LIMIT 5;`
  );
  const formattedDataCustomer = allCustomerWithAmount.rows.map((row) => ({
    ...row,

    qty: Number(row.qty), // Convert qty to number
    amount: Number(row.amount), // Convert amount to number
  }));

  res.status(200).json({
    status: "success",
    data: {
      TotalSaudaMonthlyValue,
      TotalSaudaYearlyValue,
      TotalPendingSaudaValue,
      TotalMonthlyOrderValue,
      TotalYearlyOrderValue,
      TotalPendingOrderValue,
      TotalInvoiceMonthlyValue,
      TotalInvoiceYearlyValue,
      allItemWithAmount,
      formattedData,
      formattedDataSize,
      formattedDataGrade,
      formattedDataCustomer,
    },
  });
});

exports.getrollingProduction = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  let baseQuery = `
  SELECT
    h.ssh_code,timestamptostring(h.stock_date)  stock_date,-- Extract only the date part
    get_item(d.item_code) AS item,
    get_size(d.size_code) AS size_nm,
    get_quality(d.quality_code) AS grade,
    d.no_of_picces AS pcs,
    COALESCE(d.quantity, 0) AS quantity,
    get_uom(d.uom_code) AS uom
FROM
    SL_STOCK_STATUS_HDR h
JOIN
    SL_STOCK_STATUS_DET d ON h.ssh_code = d.ssh_code
WHERE
    h.marked IS NULL
    AND d.marked IS NULL
    AND h.company_code =${req.user.company}
    AND h.unit_code =${req.user.unit}
    and h.fin_year='${req.user.finyear}'`;

  if (req.query.from && req.query.to) {
    baseQuery += ` AND H.stock_date BETWEEN '${req.query.from}' AND '${req.query.to}'`;
  }

  const invoice = await client.query(baseQuery);
  console.log(invoice, "stockkkkkkkkkkkkkkkkkkcontroller");

  res.status(200).json({
    status: "success",
    data: {
      invoice: invoice,
    },
  });
});

exports.getrollingProductionByWeek = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // Calculate start and end of the week
  const today = new Date();
  const startOfWeek = today.getDate() - today.getDay();
  const endOfWeek = startOfWeek + 6;
  const startDate = new Date(today.setDate(startOfWeek));
  const endDate = new Date(today.setDate(endOfWeek));

  // Format dates to ISO and reverse
  const startDateInISO = startDate.toISOString().split("T")[0];
  const endDateInISO = endDate.toISOString().split("T")[0];
  const startDate2 = startDateInISO.split("-").reverse().join("-");
  const endDate2 = endDateInISO.split("-").reverse().join("-");

  const dat1 = [];

  // Format date for PostgreSQL
  function date_to_postgres(dateparam) {
    const date = new Date(dateparam);
    date.setHours(date.getHours() + 5);
    date.setMinutes(date.getMinutes() + 30);
    const reversedDate = date
      .toISOString()
      .slice(0, 10)
      .split("-")
      .reverse()
      .join("-");
    return reversedDate;
  }

  // Updated SQL query
  const query = `
  SELECT
  h.ssh_code,timestamptostring(h.stock_date)  stock_date,-- Extract only the date part
  get_item(d.item_code) AS item,
  get_size(d.size_code) AS size_nm,
  get_quality(d.quality_code) AS grade,
  d.no_of_picces AS pcs,
  COALESCE(d.quantity, 0) AS quantity,
  get_uom(d.uom_code) AS uom
FROM
  SL_STOCK_STATUS_HDR h
JOIN
  SL_STOCK_STATUS_DET d ON h.ssh_code = d.ssh_code
WHERE
  h.marked IS NULL
  AND d.marked IS NULL
  AND h.company_code =${req.user.company}
  AND h.unit_code =${req.user.unit}
  and h.fin_year='${req.user.finyear}'`;

  const invoice = await client.query(query);

  // Map result rows to the response format

  res.status(200).json({
    status: "success",
    data: {
      invoice: invoice,
    },
  });
});

// furnace production

exports.getfurnaceProductionByWeek = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // Calculate start and end of the week
  const today = new Date();
  const startOfWeek = today.getDate() - today.getDay();
  const endOfWeek = startOfWeek + 6;
  const startDate = new Date(today.setDate(startOfWeek));
  const endDate = new Date(today.setDate(endOfWeek));

  // Format dates to ISO and reverse
  const startDateInISO = startDate.toISOString().split("T")[0];
  const endDateInISO = endDate.toISOString().split("T")[0];
  const startDate2 = startDateInISO.split("-").reverse().join("-");
  const endDate2 = endDateInISO.split("-").reverse().join("-");

  const dat1 = [];

  // Format date for PostgreSQL
  function date_to_postgres(dateparam) {
    const date = new Date(dateparam);
    date.setHours(date.getHours() + 5);
    date.setMinutes(date.getMinutes() + 30);
    const reversedDate = date
      .toISOString()
      .slice(0, 10)
      .split("-")
      .reverse()
      .join("-");
    return reversedDate;
  }

  // Updated SQL query
  const query = `
  SELECT
  h.exec_code prod_code,
  TO_CHAR(h.exec_date, 'DD-MM-YYYY') AS prod_date,-- Extract only the date part
  get_item(d.item_cd) AS item,
  get_size(d.size_cd) AS size_nm,
  get_quality(d.quality_cd) AS grade,
  d.pcs,
  COALESCE(d.qty, 0) AS quantity,
  get_uom(d.uom_code) AS uom
FROM
  prod_exec_hdr h
JOIN
  PROD_EXEC_PRODUCT_DET d ON h.exec_code = d.exec_cd
WHERE
  h.marked IS NULL
  AND d.marked IS NULL
  AND h.company_code =${req.user.company}
  AND h.unit_code =${req.user.unit}
  and h.fin_year='${req.user.finyear}'
      AND h.exec_date BETWEEN '${startDateInISO}' AND '${endDateInISO}'`;

  const invoice = await client.query(query);

  // Map result rows to the response format

  res.status(200).json({
    status: "success",
    data: {
      invoice: invoice,
    },
  });
});
exports.getfurnaceProduction = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  let baseQuery = `
  SELECT
  h.exec_code prod_code,
  TO_CHAR(h.exec_date, 'DD-MM-YYYY') AS prod_date,-- Extract only the date part
  get_item(d.item_cd) AS item,
  get_size(d.size_cd) AS size_nm,
  get_quality(d.quality_cd) AS grade,
  d.pcs,
  COALESCE(d.qty, 0) AS quantity,
  get_uom(d.uom_code) AS uom
FROM
  prod_exec_hdr h
JOIN
  PROD_EXEC_PRODUCT_DET d ON h.exec_code = d.exec_cd
WHERE
  h.marked IS NULL
  AND d.marked IS NULL
  AND h.company_code =${req.user.company}
  AND h.unit_code =${req.user.unit}
  and h.fin_year='${req.user.finyear}'`;

  if (req.query.from && req.query.to) {
    baseQuery += ` AND H.exec_date BETWEEN '${req.query.from}' AND '${req.query.to}'`;
  }

  const invoice = await client.query(baseQuery);
  console.log(invoice, "stockkkkkkkkkkkkkkkkkkcontroller");

  res.status(200).json({
    status: "success",
    data: {
      invoice: invoice,
    },
  });
});

//breakdownfeeding register

exports.getBreakdownFeedByWeek = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // Calculate start and end of the week
  const today = new Date();
  const startOfWeek = today.getDate() - today.getDay();
  const endOfWeek = startOfWeek + 6;
  const startDate = new Date(today.setDate(startOfWeek));
  const endDate = new Date(today.setDate(endOfWeek));

  // Format dates to ISO and reverse
  const startDateInISO = startDate.toISOString().split("T")[0];
  const endDateInISO = endDate.toISOString().split("T")[0];
  const startDate2 = startDateInISO.split("-").reverse().join("-");
  const endDate2 = endDateInISO.split("-").reverse().join("-");

  const dat1 = [];

  // Format date for PostgreSQL
  function date_to_postgres(dateparam) {
    const date = new Date(dateparam);
    date.setHours(date.getHours() + 5);
    date.setMinutes(date.getMinutes() + 30);
    const reversedDate = date
      .toISOString()
      .slice(0, 10)
      .split("-")
      .reverse()
      .join("-");
    return reversedDate;
  }

  // Updated SQL query
  const query = `
  select h.code,TO_CHAR(h.feeding_date,'DD-MM-YYYY') breakdown_date,TO_CHAR(d.f_date,'DD-MM-YYYY')from_date,d.from_time
,TO_CHAR(d.t_date,'DD-MM-YYYY') to_date,d.to_time,d.no_of_hors,
get_location(d.location_code)location,get_reason(d.breakdown_reason_code)reason,d.solution
from BREAKDOWN_FEEDING_HDR h ,BREAKDOWN_FEEDING_DET d
where h.marked is null and d.marked is null and h.code=d.code and h.company_code=${req.user.company} and h.unit_code=${req.user.unit}
and h.fin_year='${req.user.finyear}'
      AND h.feeding_date BETWEEN '${startDateInISO}' AND '${endDateInISO}'`;

  const invoice = await client.query(query);

  // Map result rows to the response format

  res.status(200).json({
    status: "success",
    data: {
      invoice: invoice,
    },
  });
});
exports.getBreakdownFeed = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  let baseQuery = `
  select h.code,TO_CHAR(h.feeding_date,'DD-MM-YYYY') breakdown_date,TO_CHAR(d.f_date,'DD-MM-YYYY')from_date,d.from_time
,TO_CHAR(d.t_date,'DD-MM-YYYY') to_date,d.to_time,d.no_of_hors,
get_location(d.location_code)location,get_reason(d.breakdown_reason_code)reason,d.solution
from BREAKDOWN_FEEDING_HDR h ,BREAKDOWN_FEEDING_DET d
where h.marked is null and d.marked is null and h.code=d.code and h.company_code=${req.user.company} and h.unit_code=${req.user.unit}
and h.fin_year='${req.user.finyear}'`;

  if (req.query.from && req.query.to) {
    baseQuery += ` AND H.feeding_date BETWEEN '${req.query.from}' AND '${req.query.to}'`;
  }

  const invoice = await client.query(baseQuery);
  console.log(invoice, "stockkkkkkkkkkkkkkkkkkcontroller");

  res.status(200).json({
    status: "success",
    data: {
      invoice: invoice,
    },
  });
});
// rolling produced item ----------

// select get_item(item_code)item,sum(quantity) qty from SL_STOCK_STATUS_DET
// where marked is null and company_code=1 and unit_code=1
// and item_code in (select item_code from sl_mst_item where marked is null
// and item_category=1 and company_code=1)
// group by item_code

// Wastage analysis pie chart-----------
// -------------------------------
// select get_item(item_code)item,sum(quantity) qty from SL_STOCK_STATUS_DET
// where marked is null and company_code=1 and unit_code=1 and item_code not in (select item_code from sl_mst_item where marked is null and item_category=1 and company_code=1)
// group by item_code
// ----------------------------------------------------------------
// ----furnace produced item-------
// --------------------------------
// select get_item(item_cd)item,sum(qty)qty from PROD_EXEC_PRODUCT_DET
// where marked is null and company_code=1 and unit_code=1 and item_cd in (select item_code from sl_mst_item where marked is null and item_category=1 and company_code=1)
// group by item_cd
// -------------------------------------------------------------------
// -----------------Breakdown reason pie chart--------
// -------------------------------------------------------------------
// select get_reason(reason_code)reasion,count(*) from BREAKDOWN_FEEDING_DET
// where marked is null and company_code=1 and unit_code=1
// group by reason_code
