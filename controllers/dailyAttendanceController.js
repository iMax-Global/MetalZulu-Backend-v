/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
/* eslint-disable no-loop-func */
const { Client } = require("pg");
const wrapper = require("../utils/wrapper");



const generateId = async (connection) => {
  const response = await connection.query(`SELECT MAX(ATTEND_CODE) AS MAX FROM HR_ATTENDANCE_MST`);
  const maxValue = response.rows[0].max ? Number(response.rows[0].max) : 0; // Default to 0 if NULL
  return maxValue + 1;
};




exports.getDailyAttendance = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  console.log(req.query,"querrrrrrrrrrrrrrrrrrrrryyyyyyyyyy");
  const { site, date, code, empType, dept } = req.query;
  if (!site || !date) {
    return res.status(400).json({
      message: 'Please specify Site Code and Attendance Date',
    });
  }

  let q = `SELECT HR_ATTENDANCE_MST.ATTEND_CODE AS ATTEND_CODE, EMPLOYEE_CODE AS EMP_CODE, SL_MST_EMPLOYEE.CARD_NO AS CARD_NO, EMPLOYEE_NAME, (CASE WHEN HR_ATTENDANCE_MST.SHIFT_CODE IS NULL THEN SL_MST_EMPLOYEE.SHIFT ELSE HR_ATTENDANCE_MST.SHIFT_CODE END) AS SHIFT_CODE, 
  (CASE WHEN HR_ATTENDANCE_MST.TIME_IN IS NULL THEN TO_CHAR(HR_MST_SHIFT.IN_TIME, 'HH24:MI') ELSE HR_ATTENDANCE_MST.TIME_IN END) AS TIME_IN, (CASE WHEN HR_ATTENDANCE_MST.TIME_OUT IS NULL THEN TO_CHAR(HR_MST_SHIFT.TIME_OUT, 'HH24:MI') ELSE HR_ATTENDANCE_MST.TIME_OUT END) AS TIME_OUT, S_TIME_IN, S_TIME_OUT, NO_WORKING_HRS, OVERTIME_HRS, HR_ATTENDANCE_MST.STATUS, STATUS2 FROM SL_MST_EMPLOYEE
  LEFT OUTER JOIN HR_ATTENDANCE_MST ON HR_ATTENDANCE_MST.EMP_CODE = SL_MST_EMPLOYEE.EMPLOYEE_CODE AND HR_ATTENDANCE_MST.ATTEND_DATE = TO_DATE('${date}', 'DD-MM-YYYY')
  LEFT JOIN HR_MST_SHIFT ON HR_MST_SHIFT.SHIFT_CODE = SL_MST_EMPLOYEE.SHIFT
  WHERE SL_MST_EMPLOYEE.marked is null and SL_MST_EMPLOYEE.company_code=${req.user.company} and SL_MST_EMPLOYEE.unit_code=${req.user.unit}`;
  if (code) q += ` AND EMPLOYEE_CODE = '${code}'`;
  if (empType) q += ` AND EMPLOYEE_TYPE_CODE = ${empType}`;
  if (dept) q += ` AND EMPLOYEE_DEPT_CODE = ${dept}`;
  console.log(q,"query for attendance data");
  const attendance = await connection.query(q);

  res.status(200).json({
    status: 'success',
    data: {
      attendance,
    },
  });
});



exports.getAdditionalData = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;

  const sites = await connection.query(`SELECT SITE_CODE, SITE_DESC FROM SL_MST_SITE where marked is null and company=${req.user.company}`);
  const departments = await connection.query(`SELECT DEPT_CODE, DEPT_NAME FROM SL_MST_DEPARTMENT`);
  const empTypes = await connection.query(`SELECT EMPLOYEE_TYPE_CODE, EMPLOYEE_TYPE FROM SL_MST_EMPLOYEE_TYPE where marked is null and company_code=${req.user.company}`);
  const employees = await connection.query(`SELECT EMPLOYEE_CODE, EMPLOYEE_NAME FROM SL_MST_EMPLOYEE where marked is null and company_code=${req.user.company}`);
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




const requiredFields = {
  emp_code: 'string',
  card_no: 'string',
  shift_code: 'number',
  time_in: 'string',
  time_out: 'string',
  s_time_in: 'string',
  s_time_out: 'string',
  no_working_hrs: 'string',
  overtime_hrs: 'string',
  status: 'string',
  status2: 'string',
};




exports.updateAttendance = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;

  console.log(req.body);
  for (let i = 0; i < req.body.length; i++) {
    const row = req.body[i];
    const { date, site } = req.query;
    if (!row.attend_code) {
      const attendCode = await generateId(connection);
      let fields = ``;
      let values = ``;
      Object.keys(requiredFields).forEach((field) => {
        if (row[field]) {
          fields += `${field}, `;
          if (requiredFields[field] === 'date') values += `TO_DATE('${row[field]}', 'DD-MM-YYYY'), `;
          else if (requiredFields[field] === 'number') values += `${row[field]}, `;
          else values += `'${row[field]}', `;
        }
      });
      fields = fields.slice(0, -2);
      values = values.slice(0, -2);
      const query = `INSERT INTO HR_ATTENDANCE_MST (attend_code, attend_date, branch_code, ${fields}, company_code, user_code, unit_code, fin_year) VALUES (${attendCode}, TO_DATE('${date}', 'DD-MM-YYYY'), ${site}, ${values} , '${req.user.company}', '${req.user[0].spec_code}', '${req.user.unit}', '${req.user.finyear}')`;
      console.log(query);
      await connection.query(query);
    } 
    else {
      let fields = ``;

      Object.keys(requiredFields).forEach((field) => {
        if (row[field]) {
          if (requiredFields[field] === 'date') fields += `${field} = TO_DATE('${row[field]}', 'DD-MM-YYYY'), `;
          else if (requiredFields[field] === 'number') fields += `${field} = ${row[field]}, `;
          else fields += `${field} = '${row[field]}', `;
        }
      });
      fields = fields.slice(0, -2);
      const query = `UPDATE HR_ATTENDANCE_MST SET ${fields} WHERE ATTEND_CODE=${row.attend_code}`;
      console.log(query);
      await connection.query(query);
    }
  }



  res.status(200).json({
    status: 'success',
    message: 'Updated Attendance Data Successfully',
  });
});
