const { Client } = require("pg");
const fs = require("fs");
const wrapper = require("../utils/wrapper");



const jsonData = JSON.parse(fs.readFileSync(`${__dirname}/../normData.json`, 'utf8'));

exports.editNorm = (norm) => (req, res, next) => {
  req.params.norm = norm;
  next();
};

const generateNormId = async (normCode, tableName, connection) => {
  const response = await connection.query(`SELECT MAX(${normCode}) AS MAX FROM ${tableName}`);
  const maxValue = response.rows[0].max ? Number(response.rows[0].max) : 0; // Default to 0 if NULL
  return maxValue + 1; // Increment and return the new ID
};

exports.getAllNorms = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  let data;
  // console.log(req.params, "ye params hai")
  const get = jsonData[req.params.norm].getNdelete;
  // console.log(get, "ye get hai")
  for (let i = 0; i < get.length; i++) {
    if (get[i].responseFieldName === 'header') {
      let query = `SELECT ${get[i].fieldsRequired1} FROM ${get[i].tableName} `;
      if (get[i].leftJoiner1) {
        query += get[i].leftJoiner1.join(' ');
      }
      console.log(query);
      const dbData = await connection.query(query);
      data = dbData;
    }
  }
  res.status(200).json({
    status: 'success',
    data,
  });
});

exports.getNorm = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  const dataSources = jsonData[req.params.norm].getNdelete;
  const data = {};
  for (let i = 0; i < dataSources.length; i++) {
    const get = dataSources[i];
    let query = `SELECT ${get.fieldsRequired2} FROM ${get.tableName} `;
    if (get.leftJoiner2) {
      query += get.leftJoiner2.join(' ');
    }
    query += ` WHERE ${get.uniqueNormIdentifier}='${req.params.code}'`;
    console.log(query);
    const dbData = await connection.query(query);
    data[get.responseFieldName] = dbData;
  }

  res.status(200).json({
    status: 'success',
    data,
  });
});

exports.getAdditionalData = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  const dataSources = jsonData[req.params.norm].createNupdate;
  const data = {};

  for (let i = 0; i < dataSources.length; i++) {
    if (dataSources[i].lovFields) {
      let query = ``;
      const obj = dataSources[i].lovFields;
      for (const key in obj) {
        query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName}`;
        const dbData = await connection.query(query);
        data[key] = dbData;
      }
    }
  }

  res.status(200).json({
    status: 'success',
    data,
  });
});
// exports.getAdditionalData = wrapper(async (req, res, next) => {
//   const connection = req.dbConnection;
//   const dataSources = jsonData[req.params.norm].createNupdate;
//   const data = {};

//   for (let i = 0; i < dataSources.length; i++) {
//     if (dataSources[i].lovFields) {
//       let query = ``;
//       const obj = dataSources[i].lovFields;
//       for (const key in obj) {
//         query = `SELECT ${obj[key].columnsRequired} FROM ${obj[key].masterName}`;
//         console.log('SQL Query:', query); // Added console log here
//         const dbData = await connection.query(query);
//         data[key] = dbData;
//       }
//     }
//   }

//   res.status(200).json({
//     status: 'success',
//     data,
//   });
// });


exports.createNorm = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  const arr = jsonData[req.params.norm].createNupdate;
  console.log(req.params.norm == 'salary-norms', "TTTTTTTTTTT")
 
  const normId = await generateNormId(arr[0].uniqueNormIdentifier, arr[0].tableName, connection);
 
  // console.log(ff)
  for (let i = 0; i < arr.length; i++) {
    if (req.body[arr[i].responseFieldName]) {
      if (!arr[i].typeArray) {
        const obj = req.body[arr[i].responseFieldName][0];
        let fields = ``;
        let values = ``;
        Object.keys(arr[i].fieldsRequired).forEach((field) => {
          if (obj[field]) {
            fields += `${field}, `;
            if (arr[i].fieldsRequired[field] === 'date') values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
            else if (arr[i].fieldsRequired[field] === 'number') values += `${obj[field]}, `;
            else values += `'${obj[field]}', `;
          }
        });
        fields = fields.slice(0, -2);
        values = values.slice(0, -2);
        const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueNormIdentifier}, ${fields}) VALUES (${normId}, ${values})`;
        console.log(query);
        await connection.query(query);
      } else {
        const arr1 = req.body[arr[i].responseFieldName];
        for (let j = 0; j < arr1.length; j++) {
          const obj = arr1[j];
          let fields = ``;
          let values = ``;
          Object.keys(arr[i].fieldsRequired).forEach((field) => {
            if (obj[field]) {
              fields += `${field}, `;
              if (arr[i].fieldsRequired[field] === 'date') values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
              else if (arr[i].fieldsRequired[field] === 'number') values += `${obj[field]}, `;
              else values += `'${obj[field]}', `;
            }
          });
          fields = fields.slice(0, -2);
          values = values.slice(0, -2);
          const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueNormIdentifier}, ${fields}) VALUES (${normId}, ${values})`;
          console.log(query);
          await connection.query(query);
        }
      }
    }
  }

  if (req.params.norm == 'salary-norms') {
    const { employee_code, department_code, designation_code, emp_type } = req.body.header[0];
    let condition = '';

    if (employee_code) {
      condition = `employee_code = '${employee_code}'`;
    } else if (department_code) {
      condition = `employee_dept_code = ${department_code}`;
    } else if (designation_code) {
      condition = `employee_desig_code = ${designation_code}`;
    } else if (emp_type) {
      condition = `employee_type_code = ${emp_type}`;
    }

    if (condition) {
      const updateQuery = `
        UPDATE sl_mst_employee
        SET salary_norm_code = ${normId}
        WHERE ${condition} AND (salary_norm_code IS NULL)
      `;
      console.log(updateQuery);
      await connection.query(updateQuery);
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'Norm created Successfully',
  });

});

exports.updateNorm = wrapper(async (req, res, next) => {
  console.log(req.params.code, "TTTTTTTTTTT")
  if (!req.params.code) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please specify the Norm Code',
    });
  }
  const connection = req.dbConnection;

  const arr = jsonData[req.params.norm].createNupdate;
  for (let i = 0; i < arr.length; i++) {
    if (req.body[arr[i].responseFieldName]) {
      if (!arr[i].typeArray) {
        const obj = req.body[arr[i].responseFieldName][0];
        let fields = ``;
        Object.keys(arr[i].fieldsRequired).forEach((field) => {
          if (obj[field]) {
            if (arr[i].fieldsRequired[field] === 'date')
              fields += `${field} = TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
            else if (arr[i].fieldsRequired[field] === 'number') fields += `${field} = ${obj[field]}, `;
            else fields += `${field} = '${obj[field]}', `;
          }
        });
        fields = fields.slice(0, -2);
        const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueNormIdentifier}='${req.params.code}'`;
        console.log(query);
        await connection.query(query);
      } else {
        const arr1 = req.body[arr[i].responseFieldName];
        for (let j = 0; j < arr1.length; j++) {
          const obj = arr1[j];
          if (obj.PARAM === 'UPDATE') {
            let fields = ``;
            Object.keys(arr[i].fieldsRequired).forEach((field) => {
              if (obj[field]) {
                if (arr[i].fieldsRequired[field] === 'date')
                  fields += `${field} = TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
                else if (arr[i].fieldsRequired[field] === 'number') fields += `${field} = ${obj[field]}, `;
                else fields += `${field} = '${obj[field]}', `;
              }
            });
            fields = fields.slice(0, -2);
            const query = `UPDATE ${arr[i].tableName} SET ${fields} WHERE ${arr[i].uniqueRowIdentifier}='${
              obj[arr[i].uniqueRowIdentifier]
            }'`;
            console.log(query);
            await connection.query(query);
          } else if (obj.PARAM === 'DELETE') {
            const query = `DELETE FROM ${arr[i].tableName} WHERE ${arr[i].uniqueRowIdentifier}='${
              obj[arr[i].uniqueRowIdentifier]
            }'`;
            console.log(query);
            await connection.query(query);
          } else {
            let fields = ``;
            let values = ``;
            Object.keys(arr[i].fieldsRequired).forEach((field) => {
              if (obj[field]) {
                fields += `${field}, `;
                if (arr[i].fieldsRequired[field] === 'date') values += `TO_DATE('${obj[field]}', 'DD-MM-YYYY'), `;
                else if (arr[i].fieldsRequired[field] === 'number') values += `${obj[field]}, `;
                else values += `'${obj[field]}', `;
              }
            });
            fields = fields.slice(0, -2);
            values = values.slice(0, -2);
            const query = `INSERT INTO ${arr[i].tableName} (${arr[i].uniqueNormIdentifier}, ${fields}) VALUES (${req.params.code}, ${values})`;
            console.log(query);
            await connection.query(query);
          }
        }
      }
    }
  }
  res.status(200).json({
    status: 'success',
    message: 'Norm Updated Successfully',
  });
});



exports.deleteNorm = wrapper(async (req, res, next) => {
  const connection = req.dbConnection;
  const dataSources = jsonData[req.params.norm].getNdelete;
  if (!req.params.code) {
    return res.status(400).json({ message: 'Please specify the Norm Code' });
  }

  for (let i = 0; i < dataSources.length; i++) {
    const query = `DELETE FROM ${dataSources[i].tableName} WHERE ${dataSources[i].uniqueNormIdentifier}=${req.params.code}`;
    console.log(query);
    await connection.query(query);
  }

  res.status(200).json({
    status: 'success',
    message: 'Norm successfully deleted',
  });
});



  












