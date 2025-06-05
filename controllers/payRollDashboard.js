const { Client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");
const { query } = require("express");

exports.getDashboard = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
 
const TotalEmployees = await client.query(`select count(*) from sl_mst_employee where company_code  = ${req.user.company}`);
const TotalEmployeesValue = TotalEmployees.rows[0];
  
  const TotalOnleave  = await client.query(
    `SELECT  COUNT(*) AS total_leaves FROM hr_attendance_mst WHERE  
     DATE(attend_date) = current_date AND status = 'L' and company_code= ${req.user.company} and unit_code = ${req.user.unit};`
  );
  const TotalOnleaveValue = TotalOnleave.rows[0];
  
   const TotalAbsenties = await client.query(
    `SELECT COUNT(*) AS total_leaves FROM hr_attendance_mst
  WHERE DATE(attend_date) = current_date AND status = 'N'
  and company_code = ${req.user.company} and unit_code = ${req.user.unit};`
  );
  const TotalAbsentiesValue = TotalAbsenties.rows[0];

  const totalMonthlySalary = await client.query(
    `SELECT COALESCE(sum(net_salary),0) AS Total_salary
FROM (
    SELECT d.net_salary,
           ROW_NUMBER() OVER (PARTITION BY d.employee_code ORDER BY d.net_salary DESC) AS rn
    FROM hr_salary_allowance_det d
    JOIN hr_salary_hdr h ON d.salaryall_code = h.salary_code
    WHERE EXTRACT(MONTH FROM h.prcessed_date) = EXTRACT(MONTH from current_date) 
    and h.company_code = ${req.user.company} and h.unit_code = ${req.user.unit}
) subquery
WHERE rn = 1 `
  );

  
  const TotalMonthlySalaryValue = totalMonthlySalary.rows[0];

  const TotalYearlySalary = await client.query(
    `SELECT COALESCE(SUM(net_salary), 0) AS Total_salary
FROM (
    SELECT d.net_salary,
           ROW_NUMBER() OVER (PARTITION BY d.employee_code ORDER BY d.net_salary DESC) AS rn
    FROM hr_salary_allowance_det d
    JOIN hr_salary_hdr h ON d.salaryall_code = h.salary_code
    WHERE h.prcessed_date>=(select st_date from fin_mst_year_mst where marked is null and year_nm='${req.user.finyear}')
    and h.prcessed_date <=current_date
     and h.company_code = ${req.user.company} and h.unit_code = ${req.user.unit}
) subquery
WHERE rn = 1`
  );

  const TotalYearlySalaryValue = TotalYearlySalary.rows[0];

  const MonthlyAllowance = await client.query(
    `SELECT sum(allowance_value)allow_value_monthly
FROM (
    SELECT 
        d.allowance_code, -- Replace with the actual column name for the allowance type
        COALESCE(SUM(d.allowance_value), 0) AS allowance_value
    FROM hr_salary_allowance_det d
    JOIN hr_salary_hdr h ON d.salaryall_code = h.salary_code
    WHERE EXTRACT(MONTH FROM h.prcessed_date) = EXTRACT(MONTH from current_date) and h.company_code = ${req.user.company} and h.unit_code = ${req.user.unit}
    GROUP BY d.allowance_code
) subquery;`
  );

  const MonthlyAllowanceValue = MonthlyAllowance.rows[0];


  const YearlyAllowance = await client.query(`SELECT sum(allowance_value)allow_value_yearly
FROM (
    SELECT 
        d.allowance_code, -- Replace with the actual column name for the allowance type
        COALESCE(SUM(d.allowance_value), 0) AS allowance_value
    FROM hr_salary_allowance_det d
    JOIN hr_salary_hdr h ON d.salaryall_code = h.salary_code
    WHERE h.prcessed_date>=(select st_date from fin_mst_year_mst where marked is null and year_nm='${req.user.finyear}')
    and h.prcessed_date <=current_date and h.company_code= ${req.user.company} and h.unit_code = ${req.user.unit}
    GROUP BY d.allowance_code
) subquery;
    `);
    const YearlyAllowanceValue = YearlyAllowance.rows[0];
 



  const allItemWithAmount = await client.query(
    `SELECT  get_item(item_code) AS row_meterial, SUM(total_qty) AS qty, sum(amount2) AS amount
    FROM
        pur_mrir_det
    WHERE
        marked IS null and company_code=${req.user.company} and unit_code=${req.user.unit} and item_code in (select item_code from
        sl_mst_item where marked is null and item_category=4)
    GROUP BY
        item_code
    LIMIT 5;`
  );
  // console.log(allItemWithAmount.rows);
  const formattedData = allItemWithAmount.rows.map((row) => ({
    ...row,

    qty: Number(row.qty), // Convert qty to number
    amount: Number(row.amount), // Convert amount to number
  }));

  // console.log(`Executing query:
  // SELECT  get_item_group(s.item_group_cd) AS item, SUM(d.total_qty) AS qty, sum(d.amount2) AS amount
  //   FROM
  //       sl_mst_item s, pur_mrir_det d
  //   where s.marked is null and d.marked IS null and d.company_code=${req.user.company} and d.unit_code=${req.user.unit}and d.item_code=s.item_code
  //   and d.item_code in (select item_code from
  //       sl_mst_item where marked is null and item_category=5)
  //   GROUP BY
  //       s.item_group_cd
  //   LIMIT 5;
  // `);

  const allSizeWithAmount = await client.query(
    `SELECT  get_item_group(s.item_group_cd) AS consumable_group, SUM(d.total_qty) AS qty, sum(d.amount2) AS amount
    FROM
        sl_mst_item s, pur_mrir_det d
    where s.marked is null and d.marked IS null and d.company_code=${req.user.company} and d.unit_code=${req.user.unit} and d.item_code=s.item_code
    and d.item_code in (select item_code from
        sl_mst_item where marked is null and item_category=5)
    GROUP BY
        s.item_group_cd
    LIMIT 5;`
  );
  const formattedDataSize = allSizeWithAmount.rows.map((row) => ({
    ...row,
    qty: Number(row.qty), // Convert qty to number
    amount: Number(row.amount), // Convert amount to number
  }));

  const allGradeWithAmount = await client.query(
    `SELECT  get_party(s.party_code) AS vendor, SUM(d.total_qty) AS qty, sum(d.amount2) AS amount
    FROM
        pur_mrir_hdr s, pur_mrir_det d
    where s.marked is null and d.marked IS null and d.company_code=${req.user.company} and d.unit_code=${req.user.unit} and s.mrir_code=d.mrir_code
    GROUP BY
        s.party_code
    LIMIT 5;`
  );
  const formattedDataGrade = allGradeWithAmount.rows.map((row) => ({
    ...row,

    qty: Number(row.qty), // Convert qty to number
    amount: Number(row.amount), // Convert amount to number
  }));

  const allCustomerWithAmount = await client.query(
    `SELECT  get_item(item_code) AS consumable_item, SUM(total_qty) AS qty, sum(amount2) AS amount
    FROM
        pur_mrir_det
    WHERE
        marked IS null and company_code=${req.user.company} and unit_code=${req.user.unit} and item_code in (select item_code from
        sl_mst_item where marked is null and item_group_cd=7)
    GROUP BY
        item_code
    LIMIT 10;`
  );
  const formattedDataCustomer = allCustomerWithAmount.rows.map((row) => ({
    ...row,

    qty: Number(row.qty), // Convert qty to number
    amount: Number(row.amount), // Convert amount to number
  }));
  

  res.status(200).json({
    status: "success",
    data: {
      TotalEmployeesValue,
      TotalOnleaveValue,
      TotalAbsentiesValue,
      TotalMonthlySalaryValue,
      TotalYearlySalaryValue,
      MonthlyAllowanceValue,
      YearlyAllowanceValue,
      allItemWithAmount,
      formattedData,
      formattedDataSize,
      formattedDataGrade,
      formattedDataCustomer,
    },
  });
});
