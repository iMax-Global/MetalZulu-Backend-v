/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
// const oracledb = require('oracledb');
const wrapper = require('../utils/wrapper');

// oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
// oracledb.autoCommit = true;

const generateId = async (connection) => {
  const response = await connection.query(`SELECT MAX(ATTEND_CODE) AS MAX FROM HR_ATTENDANCE_MST`);
  return response.rows[0].max + 1;
};

exports.getLeaves = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  const { site, date, code, empType, dept } = req.query;
  if (!site || !date) {
    return res.status(400).json({
      message: 'Please specify Site Code and Attendance Date',
    });
  }

  let q = `SELECT HR_ATTENDANCE_MST.ATTEND_CODE AS ATTEND_CODE, EMPLOYEE_CODE AS EMP_CODE, SL_MST_EMPLOYEE.CARD_NO AS CARD_NO, EMPLOYEE_NAME, LEAVE_TYPE, LEAVE_TYPE2, LEAVE_PERIOD, LEAVE_PERIOD2 FROM SL_MST_EMPLOYEE
    LEFT OUTER JOIN HR_ATTENDANCE_MST ON HR_ATTENDANCE_MST.EMP_CODE = SL_MST_EMPLOYEE.EMPLOYEE_CODE AND HR_ATTENDANCE_MST.ATTEND_DATE = TO_DATE('${date}', 'DD-MM-YYYY')
    WHERE SL_MST_EMPLOYEE.UNIT_CODE=${site}`;
  if (code) q += ` AND EMPLOYEE_CODE = '${code}'`;
  if (empType) q += ` AND EMPLOYEE_TYPE_CODE = ${empType}`;
  if (dept) q += ` AND EMPLOYEE_DEPT_CODE = ${dept}`;
  console.log(q);
  const leaves = await connection.query(q);

  const leaveTpyes = await connection.query(`SELECT LEAVETYPE_CODE, LEAVETYPE_DESC FROM HR_MST_LEAVETYPE`);
  res.status(200).json({
    status: 'success',
    data: {
      leaves,
      leaveTpyes,
    },
  });
});

exports.getLeaveLov = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  let leaveNormCode;
  const { empCode } = req.query;
  if (!empCode) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please specify Employee Code',
    });
  }

  leaveNormCode = await connection.query(
    `SELECT NORMS_HDR_CODE FROM HR_LEAVE_NORMS_HDR WHERE EMP_CODE = '${empCode}'`
  );
  if (leaveNormCode.rows.length !== 0) leaveNormCode = leaveNormCode.rows[0].NORMS_HDR_CODE;
  else leaveNormCode = 0;
  console.log(leaveNormCode);

  const q = `SELECT LEAVETYPE_CODE, Get_Leave_Description(LEAVETYPE_CODE) leave_desc,SUM(opening) Opening ,SUM(norm)Norm,SUM(used) used,
  ((SUM(opening)+SUM(norm))-SUM(used)) bal FROM 
  (SELECT d.LEAVETYPE_CODE,lbal opening,0 Norm,0 Used
  FROM HR_EMP_LEAVE_OPENING_HDR h,HR_EMP_LEAVE_OPENING_DET d
  WHERE h.OPENING_Code = d.OPENING_CD
  AND EMP_CD ='${empCode}'
  AND h.marked IS NULL
  AND d.marked IS NULL
  AND OPENING_YEAR = '2018'
  UNION ALL
  SELECT LEAVE_TYPE,0 opening,LEAVES_NO norm,0 used 
  FROM HR_LEAVE_NORMS_DET
  WHERE NORMS_HDR_CODE = ${leaveNormCode}
  UNION ALL
  SELECT LEAVE_TYPE,0 opening,0 norm,leave_period
  FROM HR_ATTENDANCE_MST d
  WHERE  EMP_CoDe ='${empCode}'
  AND d.marked IS NULL
  AND ATTEND_DATE >= TO_DATE('01/01/2018','dd/mm/rrrr')
  AND ATTEND_DATE <= TO_DATE('31/12/2018','dd/mm/rrrr')
  AND LEAVE_TYPE IS NOT NULL
  UNION ALL
  SELECT LEAVE_TYPE,0 opening,0 norm,leave_period
  FROM HR_ATTENDANCE_MST_ARREAR d
  WHERE  EMP_CoDe ='${empCode}'
  AND d.marked IS NULL
  AND ATTEND_DATE >= TO_DATE('01/01/2018','dd/mm/rrrr')
  AND ATTEND_DATE <= TO_DATE('31/12/2018','dd/mm/rrrr')
  AND LEAVE_TYPE IS NOT NULL)
  GROUP BY LEAVETYPE_CODE
  HAVING ((SUM(opening)+SUM(norm))-SUM(used))>0`;

  const lov = connection.query(q);

  res.status(200).json({
    status: 'success',
    data: {
      lov,
    },
  });
});

const requiredFields = {
  LEAVE_TYPE: 'number',
  LEAVE_TYPE2: 'number',
  LEAVE_PERIOD: 'number',
  LEAVE_PERIOD2: 'number',
};

exports.updateLeaves = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;

  const row = req.body;
  
  if (!row.ATTEND_CODE) {
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
    const query = `INSERT INTO HR_ATTENDANCE_MST (ATTEND_CODE, ${fields}) VALUES (${attendCode}, ${values})`;
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
    const query = `UPDATE HR_ATTENDANCE_MST SET ${fields} WHERE ATTEND_CODE=${row.ATTEND_CODE}`;
    console.log(query);
    await connection.query(query);
  }

  res.status(200).json({
    status: 'success',
    message: 'Updated Leave Data Successfully',
  });
});
