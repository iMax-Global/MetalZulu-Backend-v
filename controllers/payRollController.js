const { Client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");
const moment = require('moment');
exports.getAllTables = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  const tables = await connection.query(`SELECT * FROM DYN_PAYROLL_MISC_DATA where marked is null`);
  res.status(200).json({
    status: 'success',
    data: {
      tables,
    },
  });
});

exports.getAllAllowance = wrapper(async (req, res, next) => {

  const connection = req.dbConnection;
  const locality = await connection.query(
    `select allowance_code , allowance_desc , allowance_type  from hr_mst_allowance where marked is null`
  );
  res.status(200).json({
    status: "success",
    data: {
      locality,
    },
  });
});
exports.getAllShift = wrapper(async (req, res, next) => {

  const connection = req.dbConnection;
  const locality = await connection.query(
    `SELECT 
    shift_code, 
    shift_desc, 
    TO_CHAR(in_time, 'HH24:MI:SS') AS in_time, 
    TO_CHAR(time_out, 'HH24:MI:SS') AS time_out 
FROM hr_mst_shift 
WHERE marked IS NULL;
`
  );
  res.status(200).json({
    status: "success",
    data: {
      locality,
    },
  });
});

exports.createAllowance = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  try {
    const { accountHeader } = req.body;

    // Validate input structure
    if (!accountHeader || !Array.isArray(accountHeader) || accountHeader.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request format - expected accountHeader array'
      });
    }

    // Process each allowance entry
    const results = await Promise.all(
      accountHeader.map(async (entry) => {
        const { allowance_desc, allowance_type } = entry;

        // Validate required fields
        if (!allowance_desc || !allowance_type) {
          throw new Error('Missing required fields');
        }

        // Insert query with parameterized values
        const result = await client.query(
          `INSERT INTO hr_mst_allowance (allowance_code, allowance_desc, allowance_type)
SELECT 
  COALESCE(MAX(allowance_code), 0) + 1, 
  $1, 
  $2 
FROM hr_mst_allowance
RETURNING allowance_code, allowance_desc, allowance_type`,
          [allowance_desc, allowance_type]
        );

        return result.rows[0];
      })
    );

    res.status(201).json({
      status: 'success',
      message: 'Allowance(s) created successfully',
      data: results
    });

  } catch (error) {
    console.error('Error creating allowance:', error);

    // Handle different error types
    const statusCode = error.message.includes('unique constraint') ? 409 : 500;
    const errorMessage = error.message.includes('unique constraint')
      ? 'Allowance with this description already exists'
      : 'Failed to create allowance';

    res.status(statusCode).json({
      status: 'error',
      message: errorMessage,
      systemMessage: error.message
    });
  }
});
exports.createShift = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  try {
    const { accountHeader } = req.body;

    // Validate input structure
    if (!accountHeader || !Array.isArray(accountHeader) || accountHeader.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request format - expected accountHeader array'
      });
    }

    // Process each shift entry
    const results = await Promise.all(
      accountHeader.map(async (entry) => {
        const { shift_desc, in_time, time_out } = entry;

        // Validate required fields
        if (!shift_desc || !in_time || !time_out) {
          throw new Error('Missing required fields');
        }

        // Convert time strings to PostgreSQL timestamp format
        let currentDate = new Date().toISOString().split('T')[0]; // Get current date
        let inTimeTimestamp = `${currentDate} ${in_time}:00`;
        let timeOutTimestamp = `${currentDate} ${time_out}:00`;

        // Handle case where time_out is on the next day
        if (time_out < in_time) {
          const nextDate = new Date(currentDate);
          nextDate.setDate(nextDate.getDate() + 1);
          const nextDateString = nextDate.toISOString().split('T')[0];
          timeOutTimestamp = `${nextDateString} ${time_out}:00`;
        }

        // Insert query with parameterized values
        const result = await client.query(
          `INSERT INTO hr_mst_shift (shift_code, shift_desc, in_time, time_out)
          SELECT 
            COALESCE(MAX(shift_code), 0) + 1, 
            $1, 
            $2::timestamp,
            $3::timestamp 
          FROM hr_mst_shift
          RETURNING shift_code, shift_desc, in_time, time_out`,
          [shift_desc, inTimeTimestamp, timeOutTimestamp]   
        );

        return result.rows[0];
      })
    );

    res.status(201).json({
      status: 'success',
      message: 'Shift created successfully',
      data: results
    });

  } catch (error) {
    console.error('Error creating shift:', error);

    // Handle different error types
    const statusCode = error.message.includes('unique constraint') ? 409 : 500;
    const errorMessage = error.message.includes('unique constraint')
      ? 'Shift with this description already exists'
      : 'Failed to create shift';

    res.status(statusCode).json({
      status: 'error',
      message: errorMessage,
      systemMessage: error.message
    });
  }
});




exports.updateShift = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const { code } = req.params;
  try {
    const { accountHeader } = req.body;

    // Validate input structure
    if (!accountHeader || !Array.isArray(accountHeader) || accountHeader.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request format - expected accountHeader array'
      });
    }

    // Process each shift entry
    const results = await Promise.all(
      accountHeader.map(async (entry) => {
        const { shift_desc, in_time, time_out } = entry;

        // Validate required fields
        if (!shift_desc || !in_time || !time_out) {
          throw new Error('Missing required fields');
        }

        // Convert time strings to PostgreSQL timestamp format
        let currentDate = new Date().toISOString().split('T')[0]; // Get current date
        let inTimeTimestamp = `${currentDate} ${in_time}`;
        let timeOutTimestamp = `${currentDate} ${time_out}`;

        // Handle case where time_out is on the next day
        if (time_out < in_time) {
          const nextDate = new Date(currentDate);
          nextDate.setDate(nextDate.getDate() + 1);
          const nextDateString = nextDate.toISOString().split('T')[0];
          timeOutTimestamp = `${nextDateString} ${time_out}`;
        }

        // Update query with parameterized values
        const result = await client.query(
          `UPDATE hr_mst_shift 
           SET shift_desc = $1, in_time = $2::timestamp, time_out = $3::timestamp
           WHERE shift_code = $4
           RETURNING shift_code, shift_desc, in_time, time_out`,
          [shift_desc, inTimeTimestamp, timeOutTimestamp, code]   
        );

        if (result.rowCount === 0) {
          throw new Error(`Shift with code ${code} not found`);
        }

        return result.rows[0];
      })
    );

    res.status(200).json({
      status: 'success',
      message: 'Shift updated successfully',
      data: results
    });

  } catch (error) {
    console.error('Error updating shift:', error);

    // Handle different error types
    const statusCode = error.message.includes('not found') ? 404 : 500;
    const errorMessage = error.message.includes('not found')
      ? error.message
      : 'Failed to update shift';

    res.status(statusCode).json({
      status: 'error',
      message: errorMessage,
      systemMessage: error.message
    });
  }
});

exports.updateAllowance = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const { code } = req.params; // Get allowance_code from URL parameter
  console.log("update contorller",code);

  try {
    const { accountHeader } = req.body;

    // Validate input structure
    if (!accountHeader || !Array.isArray(accountHeader) || accountHeader.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request format - expected accountHeader array'
      });
    }

    // Process update for each entry (should typically be single entry for update)
    const results = await Promise.all(
      accountHeader.map(async (entry) => {
        const { allowance_desc, allowance_type } = entry;
        
        // Validate required fields
        if (!allowance_desc || !allowance_type) {
          throw new Error('Missing required fields');
        }

        // First check if record exists
        const exists = await client.query(
          `SELECT 1 FROM hr_mst_allowance 
           WHERE allowance_code = $1`,
          [code]
        );

        if (exists.rowCount === 0) {
          throw new Error('Allowance record not found');
        }

        // Update query with parameterized values
        const result = await client.query(
          `UPDATE hr_mst_allowance 
           SET allowance_desc = $1, 
               allowance_type = $2
           WHERE allowance_code = $3`,
          [allowance_desc, allowance_type, code]
        );
        
        return result.rows[0];
      })
    );

    res.status(200).json({
      status: 'success',
      message: 'Allowance updated successfully',
      data: results
    });

  } catch (error) {
    console.error('Error updating allowance:', error);
    
    // Handle different error types
    const statusCode = error.message.includes('unique constraint') ? 409 : 
                      error.message.includes('not found') ? 404 : 500;
    
    const errorMessage = error.message.includes('unique constraint') 
      ? 'Allowance with this description already exists'
      : error.message.includes('not found')
      ? 'Allowance record not found'
      : 'Failed to update allowance';

    res.status(statusCode).json({
      status: 'error',
      message: errorMessage,
      systemMessage: error.message
    });
  }
});

exports.deleteShift = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const { code } = req.params; // Get allowance_code from URL parameter
  console.log("delete controller", code);

  try {
    // Update query with parameterized values
    const result = await client.query(
      `UPDATE hr_mst_shift 
       SET marked = 'D'
       WHERE shift_code = $1`,
      [code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Shift record not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Shift deleted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting shift:', error);
    
    // Handle different error types
    const statusCode = error.message.includes('unique constraint') ? 409 : 500;
    
    const errorMessage = error.message.includes('unique constraint') 
      ? 'Shift with this description already exists'
      : 'Failed to update allowance';

    res.status(statusCode).json({
      status: 'error',
      message: errorMessage,
      systemMessage: error.message
    });
  }
});
exports.deleteAllowance = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const { code } = req.params; // Get allowance_code from URL parameter
  console.log("delete controller", code);

  try {
    // Update query with parameterized values
    const result = await client.query(
      `UPDATE hr_mst_allowance 
       SET marked = 'D'
       WHERE allowance_code = $1`,
      [code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Allowance record not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Allowance deleted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting allowance:', error);
    
    // Handle different error types
    const statusCode = error.message.includes('unique constraint') ? 409 : 500;
    
    const errorMessage = error.message.includes('unique constraint') 
      ? 'Allowance with this description already exists'
      : 'Failed to update allowance';

    res.status(statusCode).json({
      status: 'error',
      message: errorMessage,
      systemMessage: error.message
    });
  }
});

exports.getTeamAdditionalData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const designation = await client.query(`select designation_code,designation from SL_MST_DESIGNATION where marked is null`);
  const department = await client.query(`select dept_code,dept_name from sl_mst_department where marked is null`);
  const leader = await client.query('select employee_code,employee_name from sl_mst_employee where marked is null');

  res.status(200).json({
    status: "success",
    designation,
    department,
    leader
  });
});


exports.createTeam = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  try {
    const { accountHeader } = req.body;

    if (!accountHeader || !Array.isArray(accountHeader) || accountHeader.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request format - expected accountHeader array'
      });
    }

    const results = await Promise.all(
      accountHeader.map(async (entry) => {
        const { pursose, department_code, designation_code, team_name, leader_code } = entry;

        if (!pursose || !department_code || !designation_code || !team_name || !leader_code) {
          throw new Error('Missing required fields');
        }

        // Corrected query
        const result = await client.query(
          `INSERT INTO hr_mst_team (team_code, pursose, deptt_code, desig_code, team_name, leader)
SELECT 
    COALESCE(MAX(team_code), 0) + 1,
    $1, 
    $2,
    $3,
    $4,
    $5
FROM hr_mst_team
RETURNING team_code, pursose, deptt_code, desig_code, team_name, leader;
`,
[pursose, department_code, designation_code, team_name, leader_code]
        );

        return result.rows[0];
      })
    );

    res.status(201).json({
      status: 'success',
      message: 'Team created successfully',
      data: results
    });

  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create team',
      systemMessage: error.message
    });
  }
});

exports.updateTeam = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const { code } = req.params;
  try {
    const { accountHeader } = req.body;
    console.log(req.body);

    // Validate input structure
    if (!accountHeader || !Array.isArray(accountHeader) || accountHeader.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request format - expected accountHeader array'
      });
    }

    // Process each shift entry
    const results = await Promise.all(
      accountHeader.map(async (entry) => {
        const { pursose,department_code,designation_code,team_name,leader_code } = entry;

        // Validate required fields
        if (!pursose || !department_code || !designation_code ||!team_name || !leader_code) {
          throw new Error('Missing required fields');
        }

     

        // Update query with parameterized values
        const result = await client.query(
          `UPDATE hr_mst_team 
           SET  pursose = $1, deptt_code = $2, desig_code = $3 , team_name = $4, leader=$5
           WHERE team_code = $6
           RETURNING team_code, pursose, deptt_code, desig_code, team_name, leader`,
          [pursose,department_code,designation_code,team_name,leader_code, code]   
        );

        if (result.rowCount === 0) {
          throw new Error(`Team with code ${code} not found`);
        }

        return result.rows[0];
      })
    );

    res.status(200).json({
      status: 'success',
      message: 'team updated successfully',
      data: results
    });

  } catch (error) {
    console.error('Error updating shift:', error);

    // Handle different error types
    const statusCode = error.message.includes('not found') ? 404 : 500;
    const errorMessage = error.message.includes('not found')
      ? error.message
      : 'Failed to update team';

    res.status(statusCode).json({
      status: 'error',
      message: errorMessage,
      systemMessage: error.message
    });
  }
});
exports.deleteTeam = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const { code } = req.params;

  try {
    const result = await client.query(
      `UPDATE hr_mst_team 
       SET marked = 'D'
       WHERE team_code = $1
       RETURNING *`,
      [code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'Team not found or already deleted'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Team deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});


exports.getTableData = wrapper(async (req, res, next) => {
  console.log("manoj singh saun");
  const connection = req.dbConnection;

  // Fetch table configuration
  const table = await connection.query(
    `SELECT * FROM DYN_PAYROLL_MISC_DATA WHERE SLUG='${req.params.slug}'`
  );

  console.log(table, "tabla");

  if (!table.rows[0]) {
    return res.status(404).json({
      status: "fail",
      message: "The table does not exist",
    });
  }

  // Initialize the base query
  let query = `SELECT ${table.rows[0].row_identifier}, ${table.rows[0].required_fields || table.rows[0].table_fields
    } FROM ${table.rows[0].table_name}`;

  // Process input_type
  const inputTypes = table.rows[0].input_type.split(","); // Split to handle multiple input types

  // Iterate through each input type
  const fields = table.rows[0].table_fields.split(", ");
  let selectFields = fields.map((field, index) => {
    // If the input type is 'datetime', apply TO_CHAR
    if (inputTypes[index] && inputTypes[index].trim() === 'datetime') {
      return `TO_CHAR(${table.rows[0].table_name}.${field}::timestamp, 'HH24:MI:SS') AS ${field}`;
    }
    return `${table.rows[0].table_name}.${field}`;
  }).join(", ");

  query = `SELECT ${table.rows[0].row_identifier}, ${selectFields} FROM ${table.rows[0].table_name}`;

  if (table.rows[0].left_joiner) {
    query += ` ${table.rows[0].left_joiner}`;
    console.log(query, "LEFT JOIN ADDED");
  }

  // Qualify the MARKED column to avoid ambiguity
  query += ` WHERE ${table.rows[0].table_name}.MARKED IS NULL`;
  console.log(query, "FINAL QUERY WITH WHERE");

  // Execute the query
  const tableData = await connection.query(query);

  // Process master lists if they exist
  const obj = {};
  if (table.rows[0].master_lists) {
    const masterLists = table.rows[0].master_lists.split(", ");
    const masterFields = table.rows[0].master_fields.split("; ");
    for (let i = 0; i < masterLists.length; i++) {
      if (masterLists[i] === "#") {
        obj[i] = [];
      } else {
        console.log(`SELECT ${masterFields[i]} FROM ${masterLists[i]}`);
        const data = await connection.query(
          `SELECT ${masterFields[i]} FROM ${masterLists[i]}`
        );
        obj[i] = data.rows;
      }
    }
  }

  // Log the output for debugging
  console.log("tableData \n" + JSON.stringify(tableData));
  console.log("table.rows[0] \n" + JSON.stringify(table.rows[0]));
  console.log("obj \n" + JSON.stringify(obj));

  // Send the response
  res.status(200).json({
    status: "success",
    data: {
      tableData,
      tableHeader: table.rows[0],
      obj,
    },
  });
});


exports.createRow = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  const table = await connection.query(`SELECT * FROM DYN_PAYROLL_MISC_DATA WHERE SLUG='${req.params.slug}'`);

  if (!table.rows[0]) {
    return res.status(404).json({
      status: 'fail',
      message: 'The table does not exist',
    });
  }

  let max = await connection.query(
    `SELECT MAX(${table.rows[0].row_identifier}) AS MAX FROM ${table.rows[0].table_name}`
  );
  console.log(max, "ewriuuuuuuuuuuuuuuuo")
  max = max.rows[0].max + 1;

  let values = ``;
  const fieldsArr = table.rows[0].table_fields.split(', ');
  const fieldTypes = table.rows[0].input_type.split(', ');
  fieldsArr.forEach((field, index) => {
    if (fieldTypes[index] === 'Date') values += `TO_DATE('${req.body[field]}', 'DD-MM-YYYY'), `;
    else if (fieldTypes[index] === 'datetime') values += `TO_TIMESTAMP('${req.body[field]}', 'DD-MM-YYYY HH24:MI:SS'), `
    else if (typeof req.body[field] === 'number') values += `${req.body[field]}, `;
    else values += `'${req.body[field]}', `;

  });
  values = values.split(`'undefined'`).join(null);
  values = values.split(`'null'`).join(null);
  values = values.slice(0, -2);
  console.log(
    `INSERT INTO ${table.rows[0].table_name} (${table.rows[0].row_identifier}, ${table.rows[0].table_fields}) VALUES (${max}, ${values})`
  );

  await connection.query(
    `INSERT INTO ${table.rows[0].table_name} (${table.rows[0].row_identifier}, ${table.rows[0].table_fields}) VALUES (${max}, ${values})`
  );
  res.status(200).json({
    status: 'success',
    message: 'Data Inserted Successfully',
  });
});

exports.updateRow = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  const table = await connection.query(`SELECT * FROM DYN_PAYROLL_MISC_DATA WHERE SLUG='${req.params.slug}'`);

  if (!table.rows[0]) {
    return res.status(404).json({
      status: 'fail',
      message: 'The table does not exist',
    });
  }
  if (!req.query.identifier) {
    return res.status(404).json({
      status: 'fail',
      message: 'Please Specify a Unique Identifier',
    });
  }
  console.log(req.body);
  let fields = ``;
  const fieldTypes = table.rows[0].input_type.split(', ');
  if (req.body) {
    Object.keys(req.body).forEach((key, index) => {
      if (fieldTypes[index] === 'Date') fields += `${key} = TO_DATE('${req.body[key]}', 'DD-MM-YYYY HH24:MI:SS'), `;
      else if (typeof req.body[key] === 'number') fields += `${key} = ${req.body[key]}, `;
      else fields += `${key} = '${req.body[key]}', `;
    });
    fields = fields.slice(0, -2);
  }

  console.log(
    `UPDATE ${table.rows[0].table_name} SET ${fields} WHERE ${table.rows[0].row_identifier}=${req.query.identifier}`
  );
  await connection.query(
    `UPDATE ${table.rows[0].table_name} SET ${fields} WHERE ${table.rows[0].row_identifier}=${req.query.identifier}`
  );
  res.status(200).json({
    status: 'success',
    message: 'Data Updated Successfully',
  });
});

exports.deleteRow = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  const table = await connection.query(`SELECT * FROM DYN_PAYROLL_MISC_DATA WHERE SLUG='${req.params.slug}'`);
  console.log(table, "tabledasssssssssssssssbgsreeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
  if (!table.rows[0]) {
    return res.status(404).json({
      status: 'fail',
      message: 'The table does not exist',
    });
  }
  if (!req.query.identifier) {
    return res.status(404).json({
      status: 'fail',
      message: 'Please Specify a Unique Identifier',
    });
  }


  await connection.query(
    `UPDATE  ${table.rows[0].table_name}  SET MARKED='D' WHERE  ${table.rows[0].row_identifier}=${req.query.identifier}`
    //  `DELETE FROM ${table.rows[0].TABLE_NAME} WHERE ${table.rows[0].ROW_IDENTIFIER}=${req.query.identifier}`
  );
  res.status(200).json({
    status: 'success',
    message: 'Row Deleted Successfully',
  });

});

exports.getAllTeam = wrapper(async (req, res, next) => {

  const connection = req.dbConnection;
  const locality = await connection.query(
    `select team_code, pursose,  get_department(deptt_code) department, deptt_code, get_designation(desig_code) designation, desig_code, team_name, leader from hr_mst_team where marked is null`
  );
  res.status(200).json({
    status: "success",
    data: {
      locality,
    },
  });
});
// exports.userValue = wrapper(async (req, res, next) => {
//   const client = req.dbConnection;

//   // console.log(req.user.finyear);
//   var year = req.user.finyear;
//   var comany_code = req.user[0].company_code;
//   var site = req.user[0];
//   var permission = req.user.PERMISSIONS;

//   const OpenningValue = await client.query(
//     `select company_name  from sl_mst_company where company_code=${req.user[0].company_code}`
//   );

//   res.status(200).json({
//     status: "success",
//     data: {
//       site,
//       OpenningValue,
//       permission,
//     },
//   });
// });
exports.userValue = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  console.log("3422222222222222fddddddddddddddddddd");
  // var year = req.user;
 var user=req.user
//  console.log(user, "ye user h")
  // var comany_code = req.user[0].company_code;
  var site = req.user.unit;
  // console.log(site[0].unit_code, "ye site h", site.unit)

  // var permission = req.user.PERMISSIONS;
  const planResult = await client.query(`SELECT plan_id FROM SL_SEC_SPEC_ITEM_HDR WHERE spec_code = '${req.user[0].spec_code}'`);

  let planId = null;
        if (planResult.rows.length > 0) {
                planId = planResult.rows[0].plan_id;
        }
      
        // 👉 Now fetch module based on planId
        let module = { rows: [] }; // default empty
        if (planId) {
          module = await client.query(`
            SELECT module_id, get_module(module_id) AS module_name 
            FROM PLAN_MODULES 
            WHERE plan_id = ${planId}
          `);
        }
  //  const module= await client.query(`select module_id, module_name from sl_mst_module`)

  var permission = req.user.PERMISSIONS;
  console.log(permission)
  //  const module= await client.query(`select module_id, module_name from sl_mst_module`)

  const unit= await client.query(`select site_code, site_desc from sl_mst_site where marked is null and company=${req.user.company}`)
  const year= await client.query(`select year_nm , year_desc from fin_mst_year_mst  where marked is null and company_code=${req.user.company}`)
  
  const OpenningValue = await client.query(
    `select company_name  from sl_mst_company where company_code=${req.user[0].company_code}`
  );


  // console.log("Permissions",permission);
  res.status(200).json({
    status: "success",
    data: {
      site,
      OpenningValue,
      user,
      module,
      unit,
      year,
      permission
    },
  });
});

exports.getAllHoliday = wrapper(async (req, res, next) => {

  const connection = req.dbConnection;
  const locality = await connection.query(
    `select holiday_code, timestamptostring(holiday_date), occassion, holiday_type as holiday_type_code, get_holiday_typ(holiday_type) holiday_type, religion_code, get_religion(religion_code) religion from hr_mst_holiday where marked is null`
  );
  res.status(200).json({
    status: "success",
    data: {
      locality,
    },
  });
});

exports.getHolidayAdditionalData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const Holiday = await client.query(`SELECT ALL HR_MST_HOLIDAY_TYPE.HOLIDAY_TYPE_DESC,
HR_MST_HOLIDAY_TYPE.HOLIDAY_TYPE_CODE
FROM HR_MST_HOLIDAY_TYPE where marked is null order by HR_MST_HOLIDAY_TYPE.HOLIDAY_TYPE_DESC`);
  const Religion = await client.query(`SELECT ALL HR_MST_RELIGION.RELIGION_DESC, HR_MST_RELIGION.RELIGION_CODE
FROM HR_MST_RELIGION where marked is null order by HR_MST_RELIGION.RELIGION_DESC`);


  res.status(200).json({
    status: "success",
    Holiday,
    Religion,
  });
});

exports.createHoliday = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  try {
    const { accountHeader } = req.body;
    console.log(req.body);

    if (!accountHeader || !Array.isArray(accountHeader) || accountHeader.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request format - expected accountHeader array'
      });
    }

    const results = await Promise.all(
      accountHeader.map(async (entry) => {
        const {  holiday_date, occasion,  holiday_type, religion } = entry;

        if (!holiday_date || !occasion || !holiday_type || !religion) {
          throw new Error('Missing required fields');
        }

        // Corrected query
        const result = await client.query(
          `INSERT INTO hr_mst_holiday (holiday_code, holiday_date, occassion, holiday_type, Religion_code)
SELECT 
    COALESCE(MAX(holiday_code), 0) + 1,
    $1, 
    $2,
    $3,
    $4
FROM hr_mst_holiday
RETURNING holiday_code, holiday_date, occassion, holiday_type, Religion_code;
`,
[holiday_date, occasion, holiday_type, religion]
        );

        return result.rows[0];
      })
    );

    res.status(201).json({
      status: 'success',
      message: 'Holiday created successfully',
      data: results
    });

  } catch (error) {
    console.error('Holiday creating team:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create team',
      systemMessage: error.message
    });
  }
});



exports.updateHoliday = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const { code } = req.params;
  try {
    const { accountHeader } = req.body;
    console.log(req.body, "body to ");

    // Validate input structure
    if (!accountHeader || !Array.isArray(accountHeader) || accountHeader.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request format - expected accountHeader array'
      });
    }

    // Process each holiday entry
    const results = await Promise.all(
      accountHeader.map(async (entry) => {
        let { holiday_date, occasion, holiday_type, religion } = entry;

        // Validate required fields
        if (!holiday_date || !occasion || !holiday_type || !religion) {
          throw new Error('Missing required fields');
        }

        // Format the date from DD-MM-YYYY to YYYY-MM-DD
        holiday_date = moment(holiday_date, 'DD-MM-YYYY').format('YYYY-MM-DD');

        // Update query with parameterized values
        const result = await client.query(
          `UPDATE hr_mst_holiday 
           SET holiday_date = $1, occassion = $2, holiday_type = $3, religion_code = $4
           WHERE holiday_code = $5
           RETURNING holiday_code, holiday_date, occassion, holiday_type, religion_code`,
          [holiday_date, occasion, holiday_type, religion, code]   
        );

        if (result.rowCount === 0) {
          throw new Error(`Holiday with code ${code} not found`);
        }

        return result.rows[0];
      })
    );

    res.status(200).json({
      status: 'success',
      message: 'Holiday updated successfully',
      data: results
    });

  } catch (error) {
    console.error('Error updating holiday:', error);

    // Handle different error types
    const statusCode = error.message.includes('not found') ? 404 : 500;
    const errorMessage = error.message.includes('not found')
      ? error.message
      : 'Failed to update holiday';

    res.status(statusCode).json({
      status: 'error',
      message: errorMessage,
      systemMessage: error.message
    });
  }
});


exports.deleteHoliday = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  const { code } = req.params; // Get allowance_code from URL parameter
  console.log("delete controller", code);

  try {
    // Update query with parameterized values
    const result = await client.query(
      `UPDATE hr_mst_holiday 
       SET marked = 'D'
       WHERE holiday_code = $1`,
      [code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'holiday record not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Holiday Data deleted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting holiday:', error);
    
    // Handle different error types
    const statusCode = error.message.includes('unique constraint') ? 409 : 500;
    
    const errorMessage = error.message.includes('unique constraint') 
      ? 'Shift with this description already exists'
      : 'Failed to update allowance';

    res.status(statusCode).json({
      status: 'error',
      message: errorMessage,
      systemMessage: error.message
    });
  }
});