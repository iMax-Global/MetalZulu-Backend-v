/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
/* eslint-disable no-loop-func */
const { Client } = require("pg");
const wrapper = require("../utils/wrapper");




function calculateAllowances(grossSalary, allowances) {
  const calculatedValues = {}; // Object to hold calculated allowances

  allowances.forEach((allowance) => {
    const {
      allowance_code,
      allowance_value,
      allowance_type_code,
      referred_allowance_code,
      allowance_effect,
    } = allowance;

    let baseValue = grossSalary; // Default base value

    // Use referred allowance if available
    if (referred_allowance_code && calculatedValues[referred_allowance_code]) {
      baseValue = calculatedValues[referred_allowance_code]; // Use previously calculated value
    }

    // Calculate allowance amount
    let allowanceAmount = 0;

    if (allowance_type_code === '%') {
      if (allowance_value !== null) {
        // Calculate percentage based on base value
        allowanceAmount = (parseFloat(allowance_value) / 100) * baseValue;
      }
    } else if (allowance_value !== null) {
      // Fixed value case (if applicable)
      allowanceAmount = parseFloat(allowance_value || 0);
    }

    // Apply effect (+/-)
    if (allowance_effect === '+') {
      calculatedValues[allowance_code] =
        (calculatedValues[allowance_code] || 0) + allowanceAmount;
    } else if (allowance_effect === '-') {
      calculatedValues[allowance_code] =
        (calculatedValues[allowance_code] || 0) - allowanceAmount;
    }
  });

  // Calculate total allowances after all calculations are done
  const totalAllowances = Object.values(calculatedValues).reduce(
    (sum, value) => sum + value,
    0
  );

  // Return both calculated allowances and total allowances
  return {
    calculatedAllowances: calculatedValues, // Map calculatedValues to calculatedAllowances
    totalAllowances, // This will contain the sum of all allowances
  };
}



exports.salarycalculate = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  const { code, empType, dept, month, attend_date } = req.query;
 
  // Parse financial year from user
  const finyearStart = parseInt(`20${req.user.finyear.slice(0, 2)}`, 10); // Start year
  const finyearEnd = parseInt(`20${req.user.finyear.slice(2)}`, 10);     // End year
  const targetYear = parseInt(month, 10) >= 4 ? finyearStart : finyearEnd; // Determine target year

  console.log(req.query, "Received Query ******************************************");

  const whereConditions = [];
  if (code) whereConditions.push(`e.employee_code = '${code}'`);
  if (empType) whereConditions.push(`e.employee_type_code = '${empType}'`);
  if (dept) whereConditions.push(`e.employee_dept_code = '${dept}'`);
  const whereClause = whereConditions.length ? 'WHERE ' + whereConditions.join(' AND ') : '';

  const employeeQuery = `
    SELECT 
      e.employee_code, e.employee_name, e.employee_dept_code, d.dept_name,
      e.employee_type_code, et.employee_type, COALESCE(e.gross_salary, 0) AS gross_salary,
      COALESCE(nh.salary_norms_hdr_code, 0) AS salary_norms_hdr_code
    FROM sl_mst_employee e
    LEFT JOIN sl_mst_department d ON e.employee_dept_code = d.dept_code
    LEFT JOIN sl_mst_employee_type et ON e.employee_type_code = et.employee_type_code
    LEFT JOIN hr_norms_salary_hdr nh ON e.salary_norm_code = nh.salary_norms_hdr_code
    where e.marked is null and e.company_code=${req.user.company}
    ${whereClause}
  `;

  console.log(employeeQuery, "Employee Query---------------------------------hello ji");
  const employees = await connection.query(employeeQuery);
  const resultRows = [];
  const dynamicAllowanceMap = new Map(); // Map to store allowance codes and their descriptions
  let sno = 1;

  for (const emp of employees.rows) {
    const { employee_code, gross_salary, salary_norms_hdr_code } = emp;

    // Fetch allowances
    const allowanceQuery = `
      SELECT nd.allowance_code, COALESCE(nd.allowance_value, 0) AS allowance_value, nd.allowance_type_code, nd.referred_allowance_code, nd.allowance_effect,
 a.allowance_desc
      FROM hr_norms_salary_det nd
      JOIN hr_mst_allowance a ON nd.allowance_code = a.allowance_code
      WHERE nd.salary_norms_hdr_code = '${salary_norms_hdr_code}'  and nd.company_code =${req.user.company}
    `;
    const allowances = (await connection.query(allowanceQuery)).rows;
    console.log(allowances, "Allowances fetched");

    // Add allowances to the map
    allowances.forEach((allowance) => {
      dynamicAllowanceMap.set(allowance.allowance_code, allowance.allowance_desc);
    });

    // Fetch attendance including leave days
    const attendanceQuery = `
      SELECT emp_code, 
             COALESCE(SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END ), 0) AS present_days,
             COALESCE(SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END), 0) AS absent_days,
             COALESCE(SUM(CASE WHEN status = 'L' THEN 1 ELSE 0 END), 0) AS leave_days
      FROM hr_attendance_mst
      WHERE EXTRACT(MONTH FROM attend_date) = '${month}'
      AND EXTRACT(YEAR FROM attend_date) = '${targetYear}'
      AND emp_code = '${employee_code}' and company_code =${req.user.company}
      GROUP BY emp_code
    `;
    console.log(attendanceQuery, "Attendance Query");
    const attendance = (await connection.query(attendanceQuery)).rows[0] || { present_days: 0, absent_days: 0 };
    console.log(attendance, "Attendance fetched");

    // Fetch leave norms for the employee
    // const leaveNormsQuery = `
    //   WITH leave_norms AS (
    //     -- Try employee-specific norms first
    //     SELECT h.norms_hdr_code, d.leaves_no, d.leave_pay
    //     FROM hr_leave_norms_hdr h
    //     JOIN hr_leave_norms_det d ON h.norms_hdr_code = d.norms_hdr_code
    //     WHERE h.emp_code = '${employee_code}'
    //     UNION ALL
    //     -- Then try department norms
    //     SELECT h.norms_hdr_code, d.leaves_no, d.leave_pay
    //     FROM hr_leave_norms_hdr h
    //     JOIN hr_leave_norms_det d ON h.norms_hdr_code = d.norms_hdr_code
    //     WHERE department_code = '${emp.employee_dept_code}'
    //     AND NOT EXISTS (
    //       SELECT 1 FROM hr_leave_norms_hdr 
    //       WHERE emp_code = '${employee_code}'
    //     )
    //     UNION ALL
    //     -- Finally try employee type norms
    //    SELECT h.norms_hdr_code, d.leaves_no, d.leave_pay
    //     FROM hr_leave_norms_hdr h
    //     JOIN hr_leave_norms_det d ON h.norms_hdr_code = d.norms_hdr_code
    //     WHERE h.emp_type = ${emp.employee_type_code}
    //     AND NOT EXISTS (
    //       SELECT 1 FROM hr_leave_norms_hdr 
    //       WHERE emp_code = '${employee_code}'
    //       OR department_code = ${emp.employee_dept_code}
    //     )
        
    //   )
    //   SELECT * FROM leave_norms LIMIT 1
    // `;

    const leaveNormsQuery = `WITH leave_norms AS (
    -- Try employee-specific norms first
    SELECT h.norms_hdr_code, d.leaves_no, d.leave_pay
    FROM hr_leave_norms_hdr h
    JOIN hr_leave_norms_det d ON h.norms_hdr_code = d.norms_hdr_code
    WHERE h.emp_code = '${employee_code}' and h.company_code =${req.user.company}
    
    UNION ALL
    
    -- Then try department norms
    SELECT h.norms_hdr_code, d.leaves_no, d.leave_pay
    FROM hr_leave_norms_hdr h
    JOIN hr_leave_norms_det d ON h.norms_hdr_code = d.norms_hdr_code
    WHERE h.company_code =${req.user.company} and (h.department_code = ${emp.employee_dept_code} OR h.department_code IS NULL)
      AND NOT EXISTS (
          SELECT 1 FROM hr_leave_norms_hdr
          WHERE emp_code = '${employee_code}' and company_code =${req.user.company}
      )
    
    UNION ALL
    
    -- Finally try employee type norms
    SELECT h.norms_hdr_code, d.leaves_no, d.leave_pay
    FROM hr_leave_norms_hdr h
    JOIN hr_leave_norms_det d ON h.norms_hdr_code = d.norms_hdr_code
    WHERE h.company_code =${req.user.company} and h.emp_type = 1 and h.company_code =${req.user.company}
      AND NOT EXISTS (
          SELECT 1 FROM hr_leave_norms_hdr
          WHERE emp_code = '${employee_code}'
            OR (department_code = ${emp.employee_dept_code} OR department_code IS NULL) and company_code =${req.user.company}
      )
)
SELECT * FROM leave_norms;
 `;
    
    // Fetch salary advance for the current month
    const advanceQuery = `
      SELECT COALESCE(SUM(amount), 0) as advance_amount
      FROM hr_emp_adv_det
      WHERE emp_cd = '${employee_code}'
      AND paid_month = '${month}'
      AND paid_year = '${targetYear}' and company_code =${req.user.company}
    `;
console.log(leaveNormsQuery, "Leave Norms Query");
    const leaveNorms = (await connection.query(leaveNormsQuery)).rows[0] || { leaves_no: 0, leave_pay: 'N' };
    console.log(leaveNorms, "Leave Norms fetched");

    console.log(leaveNorms.leaves_no/12,"Leave Norms ------------------------------ : ");
    const advanceData = (await connection.query(advanceQuery)).rows[0] || { advance_amount: 0 };

    // Salary calculations
    const baseGrossSalary = parseFloat(gross_salary) || 0;
    console.log(baseGrossSalary, "Base Gross Salary");
    const totalDays = 
    (Number(attendance.present_days) || 0) + 
    (Number(attendance.absent_days) || 0) + 
    (Number(attendance.leave_days) || 0);
    console.log(totalDays,   "Total Days");
    const perDaySalary = totalDays > 0 ? baseGrossSalary / 30 : 0;
    console.log(perDaySalary, "Per Day Salary");
    // Calculate paid and unpaid leave days
    const leaveDays = attendance.leave_days || 0;
    console.log(leaveDays, "Leave Days");

    const paidLeaveDays = leaveNorms.leave_pay === 'Y' ? 
                         Math.min(leaveDays, (leaveNorms.leaves_no/12)) : 0;
    console.log(paidLeaveDays, "Paid Leave Days");
    const unpaidLeaveDays = leaveDays - paidLeaveDays;
    console.log(unpaidLeaveDays, "Unpaid Leave Days");
    
    // Calculate actual salary considering leaves and advances
    console.log(attendance.present_days, "Present Days", Math.round(perDaySalary * ((attendance.present_days || 0) )));
    const actualSalary = Math.round(perDaySalary * (
      (Number(attendance.present_days) || 0) + Number(paidLeaveDays)
    ));
    console.log(actualSalary, "Actual Salary");
    const leaveDeduction = Math.round(perDaySalary * unpaidLeaveDays);
    const advanceDeduction = parseFloat(advanceData.advance_amount) || 0;

    // Calculate allowances
    const { calculatedAllowances, totalAllowances } = calculateAllowances(actualSalary, allowances);

    // Add to result rows
    const row = {
      SNO: sno++,
      EMPLOYEE_CODE: employee_code,
      EMPLOYEE_NAME: emp.employee_name,
      DEPARTMENT: emp.dept_name,
      EMPLOYEE_TYPE: emp.employee_type,
      GROSS_SALARY: baseGrossSalary,
      WORKING_DAYS: attendance.present_days,
      ABSENT_DAYS: attendance.absent_days,
      ACTUAL_SALARY: actualSalary,
      TOTAL_ALLOWANCES: totalAllowances,
      LEAVE_DAYS: attendance.leave_days || 0,
      PAID_LEAVES: paidLeaveDays,
      UNPAID_LEAVES: unpaidLeaveDays,
      LEAVE_DEDUCTION: leaveDeduction,
      ADVANCE_DEDUCTION: advanceDeduction,
      NET_SALARY: baseGrossSalary + totalAllowances - leaveDeduction - advanceDeduction,
    };

    // Add dynamic allowances to the row
    allowances.forEach((allowance) => {
      row[`ALLOWANCE_${allowance.allowance_code}`] = calculatedAllowances[allowance.allowance_code] || 0;
    });

    resultRows.push(row);
  }

  // Generate allowance columns with descriptions as titles
  const allowanceColumns = Array.from(dynamicAllowanceMap.entries()).map(([code, desc]) => ({
    name: `ALLOWANCE_${code}`,
    title: desc,
  }));
// console.log(allowanceColumns, )
  // Define result columns
  const resultColumns = [
    { name: 'SNO', title: 'S.No' },
    { name: 'EMPLOYEE_CODE', title: 'Employee Code' },
    { name: 'EMPLOYEE_NAME', title: 'Employee Name' },
    { name: 'DEPARTMENT', title: 'Department' },
    { name: 'EMPLOYEE_TYPE', title: 'Employee Type' },
    { name: 'GROSS_SALARY', title: 'Gross Salary' },
    { name: 'WORKING_DAYS', title: 'Working Days' },
    { name: 'ABSENT_DAYS', title: 'Absent Days' },
    { name: 'ACTUAL_SALARY', title: 'Actual Salary' },
    { name: 'LEAVE_DAYS', title: 'Leave Days' },
    { name: 'PAID_LEAVES', title: 'Paid Leaves' },
    { name: 'UNPAID_LEAVES', title: 'Unpaid Leaves' },
    { name: 'LEAVE_DEDUCTION', title: 'Leave Deduction' },
    { name: 'ADVANCE_DEDUCTION', title: 'Advance Deduction' },
    ...allowanceColumns,
    { name: 'TOTAL_ALLOWANCES', title: 'Total Allowances' },
    { name: 'NET_SALARY', title: 'Net Salary' },
  ];

  // Respond with results
  res.status(200).json({
    status: 'success',
    data: {
      rows: resultRows,
      columns: resultColumns,
    },
  });
});









exports.getAdditionalData = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;

  const sites = await connection.query(`SELECT SITE_CODE, SITE_DESC FROM SL_MST_SITE`);
  const departments = await connection.query(`SELECT DEPT_CODE, DEPT_NAME FROM SL_MST_DEPARTMENT`);
  const empTypes = await connection.query(`SELECT EMPLOYEE_TYPE_CODE, EMPLOYEE_TYPE FROM SL_MST_EMPLOYEE_TYPE`);
  const employees = await connection.query(`SELECT EMPLOYEE_CODE, EMPLOYEE_NAME FROM SL_MST_EMPLOYEE where company_code = ${req.user.company}`);
  const shifts = await connection.query(
    `SELECT SHIFT_CODE, SHIFT_DESC, TO_CHAR(IN_TIME, 'HH24:MI') AS IN_TIME, TO_CHAR(HR_MST_SHIFT.TIME_OUT, 'HH24:MI') AS TIME_OUT FROM HR_MST_SHIFT`
  );

  res.status(200).json({
    status: 'success',
    data: {
      sites,
      departments,
      empTypes,
      employees,
      shifts,
    },
  });
});




const generateSalaryId = async (connection) => {
  const response1 = await connection.query(
    `SELECT MAX(salary_code) AS m FROM HR_SALARY_HDR`
  );

  if (response1.rows[0].m === null) {
    return 1;  // If no records exist, start from 1
  } else {
    const num = Number(response1.rows[0].m) + 1;  // Increment the max salary_code
    return num;
  }
};





// exports.savesalary = wrapper(async (req, res, next) => {
//   const connection = req.dbConnection;

//   console.log(req.query, "rrrtttttttttttttt"); // Logging query params
//   console.log(req.body, "bodddddddddddddddddddddd"); // Logging request body

//   // Extract and format the date from the query
//   const [day, month, year] = req.query.date.split("/"); // Assuming req.query.date is in DD/MM/YYYY format
//   const processedDate = `${year}-${month}-${day}`; // Format it as YYYY-MM-DD

//   // Mapping numeric months to their names
//   const monthNames = {
//     "01": "January",
//     "02": "February",
//     "03": "March",
//     "04": "April",
//     "05": "May",
//     "06": "June",
//     "07": "July",
//     "08": "August",
//     "09": "September",
//     "10": "October",
//     "11": "November",
//     "12": "December",
//   };
//     // Get the month name from the mapping
//     // const salaryMonth = monthNames[req.query.month] || "Invalid Month";
//   // Generate the salary code
//   const salaryCode = await generateSalaryId(connection);

//   // Insert into HR_SALARY_HDR table
//   await connection.query(
//     `INSERT INTO HR_SALARY_HDR (salary_code, salary_month, prcessed_date) 
//      VALUES ($1, $2, $3)`,
//     [salaryCode, req.query.month, processedDate]
//   );

//   // Process allowance details
//   const allowanceData = req.body;

//   for (const employee of allowanceData) {
//     const allowances = [];

//     // Iterate over the dynamic allowance properties (ALLOWANCE_1, ALLOWANCE_2, etc.)
//     for (const key in employee) {
//       if (key.startsWith('ALLOWANCE_')) {
//         const allowanceCode = key.split('_')[1]; // Extract the number part (e.g., "1" from "ALLOWANCE_1")
//         const allowanceValue = employee[key] || 0; // Use 0 if the allowance value is not present

//         // Always include the allowance in the array (including 0 values)
//         allowances.push({ [allowanceCode]: allowanceValue });
//       }
//     }

//     // If no allowances were found, set ALLOWANCES to an empty array
//     const allowancesData = allowances.length > 0 ? JSON.stringify(allowances) : '[]';

//     // Prepare SQL query to insert employee data with allowances
//     const sql = `
//       INSERT INTO HR_SALARY_DET (
//         salary_code,  salary_month,  prcessed_date, EMPLOYEE_CODE, EMPLOYEE_NAME, DEPARTMENT, EMPLOYEE_TYPE, 
//         GROSS_SALARY, WORKING_DAYS, ABSENT_DAYS, ACTUAL_SALARY, 
//         TOTAL_ALLOWANCES, NET_SALARY, ALLOWANCES
//       ) VALUES (
//         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
//       )
//     `;

//     // Execute the query with the employee data and allowances (if any)
//     await connection.query(sql, [
//       salaryCode,
//       req.query.month,
//       processedDate,
//       employee.EMPLOYEE_CODE,
//       employee.EMPLOYEE_NAME,
//       employee.DEPARTMENT,
//       employee.EMPLOYEE_TYPE,
//       employee.GROSS_SALARY,
//       employee.WORKING_DAYS,
//       employee.ABSENT_DAYS,
//       employee.ACTUAL_SALARY,
//       employee.TOTAL_ALLOWANCES,
//       employee.NET_SALARY,
//       allowancesData, // If no allowances, it's an empty array '[]'
//     ]);
//   }


//   res.status(200).json({
//     status: "success",
//     message: "Updated Attendance Data Successfully",
//   });
// });

// exports.savesalary = wrapper(async (req, res, next) => {
//   const connection = req.dbConnection;

//   console.log(req.query, "Query Parameters");
//   console.log(req.body, "Request Body");

//   const [day, month, year] = req.query.date.split("/"); // Assuming req.query.date is in DD/MM/YYYY format
//   const processedDate = `${year}-${month}-${day}`; // Format it as YYYY-MM-DD

//   // Generate the salary code
//   const salaryCode = await generateSalaryId(connection);

//   // Insert into HR_SALARY_HDR table
//   await connection.query(
//     `INSERT INTO HR_SALARY_HDR (salary_code, salary_month, prcessed_date) 
//      VALUES ($1, $2, $3)`,
//     [salaryCode, req.query.month, processedDate]
//   );

//   // Process allowance details
//   const allowanceData = req.body;

//   for (const employee of allowanceData) {
//     const allowances = [];

//     // Iterate over the dynamic allowance properties (ALLOWANCE_1, ALLOWANCE_2, etc.)
//     for (const key in employee) {
//       if (key.startsWith("ALLOWANCE_")) {
//         const allowanceCode = key.split("_")[1]; // Extract the number part (e.g., "1" from "ALLOWANCE_1")
//         const allowanceValue = employee[key]; // Use the provided value

//         // Include only allowances greater than or equal to 0
//         allowances.push({ allowanceCode, allowanceValue });
//       }
//     }

//     // Check if allowances array is empty
//     if (allowances.length === 0) {
//       // Insert a row with NULL for allowance_code and allowance_value
//       await connection.query(
//         `INSERT INTO HR_SALARY_allowance_DET (
//           salaryall_code, allowance_code, allowance_value, EMPLOYEE_CODE, 
//           GROSS_SALARY, WORKING_DAYS, ABSENT_DAYS, ACTUAL_SALARY, 
//           TOTAL_ALLOWANCES, NET_SALARY
//         ) VALUES (
//           $1, NULL, NULL, $2, $3, $4, $5, $6, $7, $8
//         )`,
//         [
//           salaryCode,
//           employee.EMPLOYEE_CODE,
//           employee.GROSS_SALARY,
//           employee.WORKING_DAYS,
//           employee.ABSENT_DAYS,
//           employee.ACTUAL_SALARY,
//           employee.TOTAL_ALLOWANCES,
//           employee.NET_SALARY,
//         ]
//       );
//     } else {
//       // Insert each allowance into the database
//       for (const allowance of allowances) {
//         await connection.query(
//           `INSERT INTO HR_SALARY_allowance_DET (
//             salaryall_code, allowance_code, allowance_value, EMPLOYEE_CODE, 
//             GROSS_SALARY, WORKING_DAYS, ABSENT_DAYS, ACTUAL_SALARY, 
//             TOTAL_ALLOWANCES, NET_SALARY
//           ) VALUES (
//             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
//           )`,
//           [
//             salaryCode,
//             allowance.allowanceCode,
//             allowance.allowanceValue,
//             employee.EMPLOYEE_CODE,
//             employee.GROSS_SALARY,
//             employee.WORKING_DAYS,
//             employee.ABSENT_DAYS,
//             employee.ACTUAL_SALARY,
//             employee.TOTAL_ALLOWANCES,
//             employee.NET_SALARY,
//           ]
//         );
//       }
//     }
//   }

//   res.status(200).json({
//     status: "success",
//     message: "Updated Salary Data Successfully",
//   });
// });



exports.savesalary = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;

  console.log(req.query, "Query Parameters");
  console.log(req.body, "Request Body");

  const [day, month, year] = req.query.date.split("/"); // Assuming req.query.date is in DD/MM/YYYY format
  const processedDate = `${year}-${month}-${day}`; // Format it as YYYY-MM-DD

  // Generate the salary code
  const salaryCode = await generateSalaryId(connection);

  // Array to store skipped employees
  const skippedEmployees = [];

  // Process allowance details
  const allowanceData = req.body;

  for (const employee of allowanceData) {
    // Check if the salary record for the employee and month already exists
    const existingRecord = await connection.query(
      `SELECT COUNT(*) AS count 
       FROM HR_SALARY_HDR hdr
       JOIN HR_SALARY_allowance_DET det ON hdr.salary_code = det.salaryall_code
       WHERE hdr.salary_month = $1 AND det.EMPLOYEE_CODE = $2`,
      [req.query.month, employee.EMPLOYEE_CODE]
    );

    if (existingRecord.rows[0].count > 0) {
      // Add employee to skipped list
      skippedEmployees.push({
        employeeCode: employee.EMPLOYEE_CODE,
        message: `Salary for employee ${employee.EMPLOYEE_CODE} already saved for month ${req.query.month}.`,
      });
      continue; // Skip this employee if the record exists
    }

    // Insert into HR_SALARY_HDR table
    await connection.query(
      `INSERT INTO HR_SALARY_HDR (salary_code, salary_month, prcessed_date, company_code, user_code, unit_code, fin_year) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [salaryCode, req.query.month, processedDate, req.user.company, req.user[0].spec_code, req.user.unit, req.user.finyear]
    );

    // Process and insert allowances
    const allowances = [];

    for (const key in employee) {
      if (key.startsWith("ALLOWANCE_")) {
        const allowanceCode = key.split("_")[1]; // Extract the number part (e.g., "1" from "ALLOWANCE_1")
        const allowanceValue = employee[key]; // Use the provided value
        allowances.push({ allowanceCode, allowanceValue });
      }
    }

    // Insert allowances or null if no allowances exist
    if (allowances.length === 0) {
      await connection.query(
        `INSERT INTO HR_SALARY_allowance_DET (
          salaryall_code, allowance_code, allowance_value, EMPLOYEE_CODE, 
          GROSS_SALARY, WORKING_DAYS, ABSENT_DAYS, ACTUAL_SALARY, 
          TOTAL_ALLOWANCES, NET_SALARY, company_code, user_code, unit_code, fin_year
        ) VALUES (
          $1, NULL, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )`,
        [
          salaryCode,
          employee.EMPLOYEE_CODE,
          employee.GROSS_SALARY,
          employee.WORKING_DAYS,
          employee.ABSENT_DAYS,
          employee.ACTUAL_SALARY,
          employee.TOTAL_ALLOWANCES,
          employee.NET_SALARY,
          req.user.company, 
          req.user[0].spec_code,
          req.user.unit,
          req.user.finyear
        ]
      );
    } else {
      for (const allowance of allowances) {
        await connection.query(
          `INSERT INTO HR_SALARY_allowance_DET (
            salaryall_code, allowance_code, allowance_value, EMPLOYEE_CODE, 
            GROSS_SALARY, WORKING_DAYS, ABSENT_DAYS, ACTUAL_SALARY, 
            TOTAL_ALLOWANCES, NET_SALARY
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
          )`,
          [
            salaryCode,
            allowance.allowanceCode,
            allowance.allowanceValue,
            employee.EMPLOYEE_CODE,
            employee.GROSS_SALARY,
            employee.WORKING_DAYS,
            employee.ABSENT_DAYS,
            employee.ACTUAL_SALARY,
            employee.TOTAL_ALLOWANCES,
            employee.NET_SALARY,
          ]
        );
      }
    }
  }

  // Respond to the client
  res.status(200).json({
    status: "success",
    message: "Salary data processed.",
    skippedEmployees, // Send skipped employees to the client
  });
});
