const { Client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");
const pdf2base64 = require("pdf-to-base64");
const Pdfmake = require("pdfmake");
const util = require("util");
const unlink = util.promisify(fs.unlink);
const path = require("path");

const jsonData = JSON.parse(
  fs.readFileSync(`${__dirname}/../admin.json`, "utf8")
);


const generateRightsId = async (client) => {
  const response1 = await client.query(
    `SELECT MAX(rights_id)M FROM sl_sec_login_rights`
  );

  return Number(response1.rows[0].m) + 1;
};

exports.getAllTax = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const tax = await client.query(
    `SELECT spec_code, item_code, role_cd, company_code from sl_sec_spec_item_hdr  where marked is null and company_code= ${req.user.company} `
);


// `SELECT tax_code, hsn, timestamptostring(norm_date) norm_date,  timestamptostring(f_date)f_date, timestamptostring(t_date)t_date from sl_mst_item_tax_hdr  where marked is null and company_code= ${req.user.company} `
  res.status(200).json({
    status: "success",
    data: {
      tax,
      // dat1
    },
  });
});


exports.userValue = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  var year = req.user.finyear;
  var comany_code = req.user[0].company_code;
  var site = req.user[0];

  const UserValue = await client.query(
    `select spec_code, get_employee_nm(spec_code) user_name  from sl_sec_spec_item_hdr where company_code=${req.user.company} and marked is null`
  );
  
  res.status(200).json({
    status: "success",
    data: {
     UserValue,
   
    },
  });
});


exports.moduleValue = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  var year = req.user.finyear;
  var comany_code = req.user[0].company_code;
  var site = req.user[0];
  const {id} = req.params;
  console.log(id,"idsddfkjsdfkjksjfklsdjkfjse;kdfjsdkfjko;sdjfkfioksjdfk");
  const module = await client.query(
    `select module, get_module(module)  from sl_sec_spec_item_det where marked is null and spec_cd= '${id}'`
  );
  res.status(200).json({
    status: "success",
    data: {
     module 
    },
  });
});


// exports.saveLoginRights = wrapper(async (req, res) => {
//   const client = req.dbConnection;
//   const rights_id = await generateRightsId(client);
//   try {
//     await client.query('BEGIN');

//     const {
//       user,
//       module,
//       transactionType,
//       selectedForms
//     } = req.body;

//     for (const form of selectedForms) {
//       const query = `
//         INSERT INTO sl_sec_login_rights (
//           rights_id,login_code, l_add, l_modify, l_delete, l_query, user_code, form_id, module,
//           l_all, a_all_days, a_sunday, a_monday, a_tuesday, a_wednesday, a_thursday, a_friday, a_saturday,
//           m_all_days, m_sunday, m_monday, m_tuesday, m_wednesday, m_thursday, m_friday, m_saturday,
//           d_all_days, d_sunday, d_monday, d_tuesday, d_wednesday, d_thursday, d_friday, d_saturday,
//           q_all_days, q_sunday, q_monday, q_tuesday, q_wednesday, q_thursday, q_friday, q_saturday,
//           time
//         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43)
//         ON CONFLICT (rights_id) DO UPDATE SET
//           l_add = EXCLUDED.l_add,
//           l_modify = EXCLUDED.l_modify,
//           l_delete = EXCLUDED.l_delete,
//           l_query = EXCLUDED.l_query,
//           l_all = EXCLUDED.l_all,
//           a_all_days = EXCLUDED.a_all_days,
//           a_sunday = EXCLUDED.a_sunday,
//           a_monday = EXCLUDED.a_monday,
//           a_tuesday = EXCLUDED.a_tuesday,
//           a_wednesday = EXCLUDED.a_wednesday,
//           a_thursday = EXCLUDED.a_thursday,
//           a_friday = EXCLUDED.a_friday,
//           a_saturday = EXCLUDED.a_saturday,
//           m_all_days = EXCLUDED.m_all_days,
//           m_sunday = EXCLUDED.m_sunday,
//           m_monday = EXCLUDED.m_monday,
//           m_tuesday = EXCLUDED.m_tuesday,
//           m_wednesday = EXCLUDED.m_wednesday,
//           m_thursday = EXCLUDED.m_thursday,
//           m_friday = EXCLUDED.m_friday,
//           m_saturday = EXCLUDED.m_saturday,
//           d_all_days = EXCLUDED.d_all_days,
//           d_sunday = EXCLUDED.d_sunday,
//           d_monday = EXCLUDED.d_monday,
//           d_tuesday = EXCLUDED.d_tuesday,
//           d_wednesday = EXCLUDED.d_wednesday,
//           d_thursday = EXCLUDED.d_thursday,
//           d_friday = EXCLUDED.d_friday,
//           d_saturday = EXCLUDED.d_saturday,
//           q_all_days = EXCLUDED.q_all_days,
//           q_sunday = EXCLUDED.q_sunday,
//           q_monday = EXCLUDED.q_monday,
//           q_tuesday = EXCLUDED.q_tuesday,
//           q_wednesday = EXCLUDED.q_wednesday,
//           q_thursday = EXCLUDED.q_thursday,
//           q_friday = EXCLUDED.q_friday,
//           q_saturday = EXCLUDED.q_saturday,
//           time = EXCLUDED.time
//       `;

//       const values = [
//         rights_id,
//         user, // login_code
//         form.add, // l_add
//         form.modify, // l_modify
//         form.delete, // l_delete
//         form.query, // l_query
//         user, // user_code
//         form.formId, // form_id
//         module, // module
//         form.allow, // l_all
//         form.addDays?.includes('All') ? 'Y' : 'N', // a_all_days
//         form.addDays?.includes('Sun') ? 'Y' : 'N', // a_sunday
//         form.addDays?.includes('Mon') ? 'Y' : 'N', // a_monday
//         form.addDays?.includes('Tue') ? 'Y' : 'N', // a_tuesday
//         form.addDays?.includes('Wed') ? 'Y' : 'N', // a_wednesday
//         form.addDays?.includes('Thu') ? 'Y' : 'N', // a_thursday
//         form.addDays?.includes('Fri') ? 'Y' : 'N', // a_friday
//         form.addDays?.includes('Sat') ? 'Y' : 'N', // a_saturday
//         form.modifyDays?.includes('All') ? 'Y' : 'N', // m_all_days
//         form.modifyDays?.includes('Sun') ? 'Y' : 'N', // m_sunday
//         form.modifyDays?.includes('Mon') ? 'Y' : 'N', // m_monday
//         form.modifyDays?.includes('Tue') ? 'Y' : 'N', // m_tuesday
//         form.modifyDays?.includes('Wed') ? 'Y' : 'N', // m_wednesday
//         form.modifyDays?.includes('Thu') ? 'Y' : 'N', // m_thursday
//         form.modifyDays?.includes('Fri') ? 'Y' : 'N', // m_friday
//         form.modifyDays?.includes('Sat') ? 'Y' : 'N', // m_saturday
//         form.deleteDays?.includes('All') ? 'Y' : 'N', // d_all_days
//         form.deleteDays?.includes('Sun') ? 'Y' : 'N', // d_sunday
//         form.deleteDays?.includes('Mon') ? 'Y' : 'N', // d_monday
//         form.deleteDays?.includes('Tue') ? 'Y' : 'N', // d_tuesday
//         form.deleteDays?.includes('Wed') ? 'Y' : 'N', // d_wednesday
//         form.deleteDays?.includes('Thu') ? 'Y' : 'N', // d_thursday
//         form.deleteDays?.includes('Fri') ? 'Y' : 'N', // d_friday
//         form.deleteDays?.includes('Sat') ? 'Y' : 'N', // d_saturday
//         form.queryDays?.includes('All') ? 'Y' : 'N', // q_all_days
//         form.queryDays?.includes('Sun') ? 'Y' : 'N', // q_sunday
//         form.queryDays?.includes('Mon') ? 'Y' : 'N', // q_monday
//         form.queryDays?.includes('Tue') ? 'Y' : 'N', // q_tuesday
//         form.queryDays?.includes('Wed') ? 'Y' : 'N', // q_wednesday
//         form.queryDays?.includes('Thu') ? 'Y' : 'N', // q_thursday
//         form.queryDays?.includes('Fri') ? 'Y' : 'N', // q_friday
//         form.queryDays?.includes('Sat') ? 'Y' : 'N', // q_saturday
//         new Date() // time
//       ];

//       await client.query(query, values);
//     }

//     await client.query('COMMIT');
//     res.status(200).json({ message: 'Login rights saved successfully' });
//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error('Error saving login rights:', error);
//     res.status(500).json({ message: 'Error saving login rights', error: error.message });
//   }
// });

exports.saveLoginRights = wrapper(async (req, res) => {
  const client = req.dbConnection;
  try {
    await client.query('BEGIN');

    const { user, module, transactionType, selectedForms, isEdit } = req.body;
  console.log("modlues is this ---------------",module);
    for (const form of selectedForms) {
      // Check if rights already exist for this user and form
      const checkQuery = `
        SELECT login_code FROM sl_sec_login_rights 
        WHERE login_code = $1 AND form_id = $2 AND marked IS NULL
      `;
      const existingRight = await client.query(checkQuery, [user, form.formId]);
      
      const query = existingRight.rows.length > 0 ? `
        UPDATE sl_sec_login_rights SET
          l_add = $3, l_modify = $4, l_delete = $5, l_query = $6,
          user_code = $7, module = $8,
          l_all = $9, 
          a_all_days = $10, a_sunday = $11, a_monday = $12, a_tuesday = $13, a_wednesday = $14, a_thursday = $15, a_friday = $16, a_saturday = $17,
          m_all_days = $18, m_sunday = $19, m_monday = $20, m_tuesday = $21, m_wednesday = $22, m_thursday = $23, m_friday = $24, m_saturday = $25,
          d_all_days = $26, d_sunday = $27, d_monday = $28, d_tuesday = $29, d_wednesday = $30, d_thursday = $31, d_friday = $32, d_saturday = $33,
          q_all_days = $34, q_sunday = $35, q_monday = $36, q_tuesday = $37, q_wednesday = $38, q_thursday = $39, q_friday = $40, q_saturday = $41,
          time = $42
        WHERE login_code = $1 AND form_id = $2 AND marked IS NULL
      ` : `
        INSERT INTO sl_sec_login_rights (
          login_code, form_id, l_add, l_modify, l_delete, l_query, user_code, module, module_id,
          l_all, a_all_days, a_sunday, a_monday, a_tuesday, a_wednesday, a_thursday, a_friday, a_saturday,
          m_all_days, m_sunday, m_monday, m_tuesday, m_wednesday, m_thursday, m_friday, m_saturday,
          d_all_days, d_sunday, d_monday, d_tuesday, d_wednesday, d_thursday, d_friday, d_saturday,
          q_all_days, q_sunday, q_monday, q_tuesday, q_wednesday, q_thursday, q_friday, q_saturday,
          time, company_code, unit_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45)
      `;

      let module_id_res = await client.query(`select get_module_id('${module}')`);
      let module_id = module_id_res.rows[0].get_module_id;
      // console.log(module_id,"module id is this ");
      // Validate required fields
      if (!form.formId) {
        throw new Error('Form ID is required');
      }

      // Values array order matches parameters in query ($1, $2, etc.)
      const values = [
        user,               // $1 - login_code
        form.formId,        // $2 - form_id
        form.add,          // $3 - l_add
        form.modify,       // $4 - l_modify
        form.delete,       // $5 - l_delete
        form.query,        // $6 - l_query
        user,             // $7 - user_code
        module,  
        module_id,         // $8 - module
        form.allow,       // $9 - l_all
        form.addDays?.includes('All') ? 'Y' : 'N',  // $10 - a_all_days
        form.addDays?.includes('Sun') ? 'Y' : 'N',
        form.addDays?.includes('Mon') ? 'Y' : 'N',
        form.addDays?.includes('Tue') ? 'Y' : 'N',
        form.addDays?.includes('Wed') ? 'Y' : 'N',
        form.addDays?.includes('Thu') ? 'Y' : 'N',
        form.addDays?.includes('Fri') ? 'Y' : 'N',
        form.addDays?.includes('Sat') ? 'Y' : 'N',
        form.modifyDays?.includes('All') ? 'Y' : 'N',
        form.modifyDays?.includes('Sun') ? 'Y' : 'N',
        form.modifyDays?.includes('Mon') ? 'Y' : 'N',
        form.modifyDays?.includes('Tue') ? 'Y' : 'N',
        form.modifyDays?.includes('Wed') ? 'Y' : 'N',
        form.modifyDays?.includes('Thu') ? 'Y' : 'N',
        form.modifyDays?.includes('Fri') ? 'Y' : 'N',
        form.modifyDays?.includes('Sat') ? 'Y' : 'N',
        form.deleteDays?.includes('All') ? 'Y' : 'N',
        form.deleteDays?.includes('Sun') ? 'Y' : 'N',
        form.deleteDays?.includes('Mon') ? 'Y' : 'N',
        form.deleteDays?.includes('Tue') ? 'Y' : 'N',
        form.deleteDays?.includes('Wed') ? 'Y' : 'N',
        form.deleteDays?.includes('Thu') ? 'Y' : 'N',
        form.deleteDays?.includes('Fri') ? 'Y' : 'N',
        form.deleteDays?.includes('Sat') ? 'Y' : 'N',
        form.queryDays?.includes('All') ? 'Y' : 'N',
        form.queryDays?.includes('Sun') ? 'Y' : 'N',
        form.queryDays?.includes('Mon') ? 'Y' : 'N',
        form.queryDays?.includes('Tue') ? 'Y' : 'N',
        form.queryDays?.includes('Wed') ? 'Y' : 'N',
        form.queryDays?.includes('Thu') ? 'Y' : 'N',
        form.queryDays?.includes('Fri') ? 'Y' : 'N',
        form.queryDays?.includes('Sat') ? 'Y' : 'N',
        new Date(),
        req.user.company,
        req.user.unit
      ];

      await client.query(query, values);
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Login rights saved successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving login rights:', error);
    
    // Handle specific validation errors
    if (error.message === 'Form ID is required') {
      return res.status(400).json({
        status: "fail",
        message: "Form ID is required for each form entry"
      });
    }
    
    // Handle other specific validation errors here if needed
    
    // Generic error response for unexpected errors
    res.status(500).json({ 
      status: "error",
      message: 'Failed to save login rights', 
      details: error.message,
      // Don't expose full error object in production
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});



exports.formValue = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  var year = req.user.finyear;
  var comany_code = req.user[0].company_code;
  var site = req.user[0];
   const formValue = await client.query(
    `select form_id , form_name , module , trans_id from sl_sec_forms`
  );
  res.status(200).json({
    status: "success",
    data: {
      formValue 
    },
  });
});
exports.getTaxData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Order Code",
    });
  }

  const data = {};
  const arr = jsonData.getNdelete.dataSources;

  for (let i = 0; i < arr.length; i++) {
    // Modify the fieldsRequired to format from_time and to_time
    let fields = arr[i].fieldsRequired
      .split(",") // Split fieldsRequired into an array
      .map((field) => field.trim()) // Trim spaces around field names
      .map((field) => {
        if (field === 'from_time' || field === 'to_time') {
          return `TO_CHAR(${field}, 'HH24:MI') AS ${field}`; // Format time without seconds
        }
        return field;
      })
      .join(", "); // Rejoin the fields into a string

    let query = `SELECT ${fields} FROM ${arr[i].tableName}`;
    if (arr[i].leftJoiner) {
      arr[i].leftJoiner.forEach((joiner) => {
        query += ` LEFT JOIN ${joiner}`;
      });
    }
    query += ` WHERE ${arr[i].uniqueReqIdentifier}='${req.params.code}' and marked is null`;

    // Execute the query
    const dbData = await client.query(query);
    data[arr[i].responseFieldName] = dbData.rows;
  }

  res.status(200).json({
    status: "success",
    data,
  });
});

exports.getAdditionalData = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  // const arr = jsonData.createNupdate.fieldNames;
  // const data = {};
  // for (let i = 0; i < arr.length; i++) {
  //   if (arr[i].lovFields) {
  //     let query = ``;
  //     const obj = arr[i].lovFields;
  //     for (const key in obj) {
  //       query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName} where marked is null and company_code =${req.user.company} `;
  //       // console.log(query);
  //       const dbData = await client.query(query);
  //       data[key] = dbData;
  //     }
  //   }
  // }
      const employee = await client.query(`SELECT employee_code,  employee_name  from sl_mst_employee `);
      const role = await client.query(`select role_code, role_desc from sl_sec_role`)
      const company = await client.query(`select company_code, company_name from sl_mst_company`)
      const site = await client.query(`select site_code, site_desc from sl_mst_site`)
      const module = await client.query(`select module_id, module_name from sl_mst_module`)
 
 
      res.status(200).json({
   
        status: "success",
    
        employee,
   
        role,
   
        company,
  
        site,
   
        module
  });
});

exports.createTax = wrapper(async (req, res, next) => {
  console.log(req.body, "Request Body");
  const client = req.dbConnection;
  const arr = jsonData.createNupdate.fieldNames;

  console.log(arr, "Configuration Array");
  // const taxCode = await generateTaxId(client);

  for (let i = 0; i < arr.length; i++) {
    if (req.body[arr[i].responseFieldName]) {
      if (!arr[i].typeArray) {
        // Single object case
        const obj = req.body[arr[i].responseFieldName][0];
        let fields = ``;
        let values = ``;

        Object.keys(arr[i].fieldsRequired).forEach((field) => {
          if (obj[field]) {
            fields += `${field}, `;

            if (arr[i].fieldsRequired[field] === "date") {
              const formattedDate = (() => {
                const date = obj[field];
                const split = date.split("-");
                const reverse = split.reverse();
                return reverse.join("-");
              })();
              values += `TO_DATE('${formattedDate}', 'YYYY-MM-DD'), `;
            } else if (arr[i].fieldsRequired[field] === "datetime") {
              const date = new Date(obj[field]);
              const timePart = date.toTimeString().slice(0, 5); // Extract time in HH:mm format
              values += `'${timePart}', `; // Insert as a string
            } else if (arr[i].fieldsRequired[field] === "number") {
              values += `${obj[field]}, `;
            } else {
              values += `'${obj[field]}', `;
            }
          }
        });

        fields = fields.slice(0, -2);
        values = values.slice(0, -2);
        const query = `INSERT INTO ${arr[i].tableName} (user_CODE, ${fields}) VALUES ('${req.user[0].spec_code}', ${values})`;
        console.log(query, "Generated Query");
        await client.query(query);
      } else {
        // Array of objects case
        const arr1 = req.body[arr[i].responseFieldName];
        for (let j = 0; j < arr1.length; j++) {
          const obj = arr1[j];
          let fields = ``;
          let values = ``;

          Object.keys(arr[i].fieldsRequired).forEach((field) => {
            if (obj[field]) {
              fields += `${field}, `;

              if (arr[i].fieldsRequired[field] === "date") {
                values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
              } else if (arr[i].fieldsRequired[field] === "datetime") {
                const date = new Date(obj[field]);
                const timePart = date.toTimeString().slice(0, 5); // Extract time in HH:mm format
                values += `'${timePart}', `; // Insert as a string
              } else if (arr[i].fieldsRequired[field] === "number") {
                values += `${obj[field]}, `;
              } else {
                values += `'${obj[field]}', `;
              }
            }
          });

          fields = fields.slice(0, -2);
          values = values.slice(0, -2);
          const query = `INSERT INTO ${arr[i].tableName} (spec_cd, ${fields}) VALUES ('${req.body.itemTax[0].spec_code}', ${values})`;
          console.log(query, "Generated Query for Array");
          await client.query(query);
        }
      }
    }
  }

  res.status(200).json({
    status: "success",
    message: "Tax Created Successfully",
  });
});






exports.deleteTax = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  if (!req.params.code) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify the Tax Code",
    });
  }
  const arr = jsonData.getNdelete.dataSources;
  for (let i = 0; i < arr.length; i++) {
    await client.query(
      `DELETE FROM ${arr[i].tableName} WHERE ${arr[i].uniqueReqIdentifier}='${req.params.code}'`
    );
  }

  res.status(200).json({
    status: "success",
    message: "Tax Deleted Successfully",
  });
});

exports.getLoginRightsByUser = wrapper(async (req, res) => {
  const client = req.dbConnection;
  const { user } = req.params;
  try {
    const query = `
      SELECT lr.*, f.form_name, f.module, f.trans_id
      FROM sl_sec_login_rights lr
      LEFT JOIN sl_sec_forms f ON lr.form_id = f.form_id
      WHERE lr.login_code = $1 AND lr.marked IS NULL
      ORDER BY f.form_name
    `;
    const { rows } = await client.query(query, [user]);
    res.status(200).json({
      status: "success",
      data: rows
    });
  } catch (error) {
    console.error('Error fetching user rights:', error);
    res.status(500).json({ message: 'Error fetching user rights', error: error.message });
  }
});

/**
 * Delete login rights by spec_code (login_code) and form_id
 * Uses soft delete by setting marked = 'D'
 */
exports.deleteLoginRight = wrapper(async (req, res) => {
  const client = req.dbConnection;
  const { specCode, formId } = req.params;
  
  if (!specCode || !formId) {
    return res.status(400).json({
      status: "fail",
      message: "Please specify both spec code and form ID"
    });
  }

  try {
    await client.query('BEGIN');
    
    // Soft delete by setting marked = 'D'
    // Uses login_code (spec_code) + form_id to identify the record
    const query = `
      UPDATE sl_sec_login_rights 
      SET marked = 'D'
      WHERE login_code = $1 AND form_id = $2 AND marked IS NULL
    `;
    const result = await client.query(query, [specCode, formId]);
    
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        status: "fail",
        message: "Login right not found or already deleted"
      });
    }

    await client.query('COMMIT');
    res.status(200).json({
      status: "success",
      message: "Login right deleted successfully"
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting login right:', error);
    res.status(500).json({
      status: "error",
      message: "Error deleting login right",
      error: error.message
    });
  }
});
