const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const wrapper = require("../utils/wrapper");
const { Client } = require("pg");
const AppError = require("../utils/appError");
const { decode } = require("punycode");
const nodemailer = require("nodemailer");
//const db = require('../db');

const signToken = (id, userType, finyear, company, unit, roleCd) =>
  jwt.sign({ id, userType, finyear, company, unit, roleCd }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });



const createSendToken = (
  user,
  userType,
  finyear,
  company,
  unit,
  statusCode,
  req,
  res
) => {
  let token;

  if (userType === "employee")
    token = signToken(user.spec_code, "employee", finyear, company, unit, user.role_cd);
  else if (userType === "Procurement Management")
    token = signToken(
      user.spec_code,
      "Procurement Management",
      finyear,
      company,
      unit,
      user.role_cd
    );
  else if (userType === "Sales")
    token = signToken(user.spec_code, "Sales", finyear, company, unit, user.role_cd);
  else if (userType === "Stock Control")
    token = signToken(user.spec_code, "Stock Control", finyear, company, unit, user.role_cd);
  else if (userType === "Financial Management")
    token = signToken(
      user.spec_code,
      "Financial Management",
      finyear,
      company,
      unit,
      user.role_cd
    );
  else if (userType === "Production")
    token = signToken(user.spec_code, "Production", finyear, company, unit, user.role_cd);
  else if (userType === "Gate Control")
    token = signToken(user.spec_code, "Gate Control", finyear, company, unit, user.role_cd);
  else if (userType === "Trasporter")
    token = signToken(user.spec_code, "Trasporter", finyear, company, unit, user.role_cd);
  else if (userType === "Job Work")
    token = signToken(user.spec_code, "Job Work", finyear, company, unit, user.role_cd);
  else if (userType === "Payroll")
    token = signToken(user.spec_code, "Payroll", finyear, company, unit, user.role_cd);
  else if (userType === "productionGuy")
    token = signToken(user.SPEC_CODE, "productionGuy", company, unit, user.role_cd);
  else if (userType === "Administrator Module")
    token = signToken(user.spec_code, "Administrator Module", finyear, company, unit, user.role_cd);
  else token = signToken(user.SERVICE_TAX, "vendor", company, unit, user.role_cd);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    sameSite: "None",
    httpOnly: true,
    secure: true,
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  // Remove password from output
  user.ITEM_CODE = undefined;
  user.C_PORTAL_PWD = undefined;
  user.V_PORTAL_PWD = undefined;

  user.userType = userType;
  user.finyear = finyear;
  user.company = company;
  user.unit = unit;
  user.role_cd = user.role_cd || null;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};



// exports.login = async (req, res, next) => {
//   let client;

//   try {
//     client = new Client({
//       user: process.env.DB_USERNAME,
//       password: process.env.DB_PASSWORD,
//       connectionString: process.env.DB_CONNECTION_STRING,
//     });
//     client.connect();
    
//     const { userCode, password, userType   } = req.body;
//     // console.log(req.body,"req------bodyyyyyyyyyyyyyy");
  
// //  console.log(req.body)
//     // 1) Check if email and password exist
    
//     if (!userCode || !password ) {
//       return next(
//         new AppError("Please provide Email, Password !", 400)
//       );
//     }
//     // Check if the user is verified (only if your system uses isverify)
// const verifyCheck = await client.query(
//   `SELECT is_verified FROM SL_SEC_SPEC_ITEM_HDR WHERE SPEC_CODE = $1`, [userCode]
// );

// // if (!verifyCheck.rows[0]?.is_verified) {
// //   return res.status(403).json({
// //     status: "fail",
// //     message: "Your account is not verified. Please verify your email first."
// //   });
// // }

// if (!verifyCheck.rows[0]?.is_verified) {
//   // Generate new OTP
//   const newOtp = generateOtp(); // This should be a function you already have
//   const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

//   // Update OTP and expiry in DB
//   await client.query(
//     `UPDATE SL_SEC_SPEC_ITEM_HDR 
//      SET otp = $1, otp_expiry = $2 
//      WHERE SPEC_CODE = $3`,
//     [newOtp.toString(), otpExpiry, userCode]
//   );

//   // Get full name and email if needed for the email template
//   const userDetails = await client.query(
//     `SELECT SPEC_CODE AS fullname FROM SL_SEC_SPEC_ITEM_HDR WHERE SPEC_CODE = $1`,
//     [userCode]
//   );

//   const email = userCode; // assuming email is used as SPEC_CODE
//   const fullname = userDetails.rows[0].fullname;

//   // Send the OTP email again
//   await sendVerificationMessage({ fullname, email, otp: newOtp });

//   return res.status(200).json({
//     status: "otp_required",
//     message: "Your account is not verified. OTP has been sent to your email. hm ji"
//   });
// }

//     let user;
//     let company;
//     let unit;
//     let finyear;
//     // 2) Check if user exists && password is correct
//     if (
//       userType === "employee" ||
//       userType === "Procurement Management" ||
//       userType === "Sales" ||
//       userType === "Stock Control" ||
//       userType === "Production" ||
//       userType === "Financial Management" ||
//       userType === "Gate Control" ||
//       userType === "Trasporter" ||
//       userType === "Job Work" ||
//       userType === "Payroll" ||
//       userType === "Administrator Module" 
//     ) {
//       user = await client.query(
//         `SELECT SPEC_CODE, user_code, decrypt10g(ITEM_CODE) AS ITEM_CODE, COMPANY_CODE, UNIT_CODE, role_cd FROM SL_SEC_SPEC_ITEM_HDR WHERE SPEC_CODE='${userCode}'`
//       );
//        console.log(user, "uuuuuuuuuuuuuuuuuuuuuuu");

//       if (!user.rows[0] || password !== user.rows[0].item_code) {
//         // return next(new AppError("Incorrect User Code or ll", 401));
//         return res
//           .status(401)
//           .json({ status: "fail", message: "Incorrect User Code or Password" });
//       }

//       if(!user.rows[0].user_code) {
// // console.log(!user.rows[0].user_code)
//       companydata = await client.query(
//         `SELECT  COMPANY_CODE  FROM sl_mst_company WHERE marked is null and SPEC_CODE='${userCode}'`
//       );11
      

//     }
//       else{
//         companydata = await client.query(
//           `SELECT  COMPANY_CODE  FROM sl_mst_company  WHERE marked is null and SPEC_CODE='${user.rows[0].user_code}'`
//         );
//       }
//       // console.log(companydata, "companyyyyyyyyyyyyyyyyyy");
//       company=companydata.rows[0].company_code;
//       // console.log(company, "companyyyyyyyyyyyyyyyyyy");

//      const unitdata = await client.query(
//         `select site_code, site_desc from sl_mst_site where marked is null and company=${company}`
//       );
//      unit=unitdata.rows[0].site_code;
//     //  console.log(unit, "unituuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu");
//     const  yeardata= await client.query(`select year_nm , year_desc from fin_mst_year_mst 
//        where marked is null and company_code=${company}`)

//     finyear=yeardata.rows[0].year_nm;

//     } else if (userType === "customer") {
//       user = await client.query(
//         `SELECT S_TAX_NO, C_PORTAL_PWD, DISTRIBUTOR_CODE, ACCOUNT_CODE, COMPANY_CODE, UNIT_CODE, DEALER_CODE FROM SL_MST_DISTRIBUTOR WHERE S_TAX_NO='${userCode}'`
//       );
//       if (!user.rows[0] || password !== user.rows[0].C_PORTAL_PWD) {
//         return next(new AppError("Incorrect Tax Number or Password", 401));
//       }
//     } else if (userType === "vendor") {
//       user = await client.query(
//         `SELECT SERVICE_TAX, V_PORTAL_PWD, ACCOUNT_CODE, PARTY_CODE, COMPANY_CODE, UNIT_CODE FROM PUR_MST_PARTY WHERE SERVICE_TAX='${userCode}'`
//       );
//       if (!user.rows[0] || password !== user.rows[0].V_PORTAL_PWD) {
//         return next(
//           new AppError("Incorrect Service Tax Number or Password", 401)
//         );
//       }
//     }
   
//     // 3) If everything ok, send token to client
//     createSendToken(
//       user.rows[0],
//       userType,
//       finyear,
//       company,
//       unit,
//       200,
//       req,
//       res
//     );
//   } catch (err) {
//     console.error(err);
//   } finally {
//     if (client) {
//       try {
//         await client.end();
//       } catch (err) {
//         console.error(err);
//       }
//     }
//   }
// };

// Route: POST /api/v1/auth/update-unit




exports.login = async (req, res, next) => {
  let client;

  try {
    client = new Client({
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      connectionString: process.env.DB_CONNECTION_STRING,
    });
    client.connect();

    const { userCode, password, userType } = req.body;

    // ✅ Superadmin Login
    console.log(userCode === "sk@imax.co.in" )

    if (userCode === "sk@imax.co.in" && password === "123@skadmin") {
     console.log("super admin login successfully")                                      
     
     
    
    
     const superAdminUser = {

        SPEC_CODE: "SUPERADMIN",
        user_code: "SUPERADMIN",
        role_cd: "superadmin"

      };

    
      return createSendToken(
        superAdminUser,
        "superadmin",
        "ALL_YEARS",
        "ALL_COMPANIES",
        "ALL_UNITS",
        200,
        req,
        res
      );
    }

    // 1) Check if email and password exist
    if (!userCode || !password) {
      return next(
        new AppError("Please provide Email, Password!", 400)
      );
    }

    // 2) Check if the user is verified
    const verifyCheck = await client.query(
      `SELECT is_verified FROM SL_SEC_SPEC_ITEM_HDR WHERE SPEC_CODE = $1`, [userCode]
    );

    if (!verifyCheck.rows[0]?.is_verified) {
      const newOtp = generateOtp();
      const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

      await client.query(
        `UPDATE SL_SEC_SPEC_ITEM_HDR 
         SET otp = $1, otp_expiry = $2 
         WHERE SPEC_CODE = $3`,
        [newOtp.toString(), otpExpiry, userCode]
      );

      const userDetails = await client.query(
        `SELECT SPEC_CODE AS fullname FROM SL_SEC_SPEC_ITEM_HDR WHERE SPEC_CODE = $1`,
        [userCode]
      );

      const email = userCode;
      const fullname = userDetails.rows[0].fullname;

      await sendVerificationMessage({ fullname, email, otp: newOtp });

      return res.status(200).json({
        status: "otp_required",
        message: "Your account is not verified. OTP has been sent to your email."
      });
    }

    let user;
    let company;
    let unit;
    let finyear;

    // 3) Check login based on user type
    if (
      userType === "employee" ||
      userType === "Procurement Management" ||
      userType === "Sales" ||
      userType === "Stock Control" ||
      userType === "Production" ||
      userType === "Financial Management" ||
      userType === "Gate Control" ||
      userType === "Trasporter" ||
      userType === "Job Work" ||
      userType === "Payroll" ||
      userType === "Administrator Module"
    )
    
    {
      user = await client.query(
        `SELECT SPEC_CODE, user_code, decrypt10g(ITEM_CODE) AS ITEM_CODE, COMPANY_CODE, UNIT_CODE, role_cd 
         FROM SL_SEC_SPEC_ITEM_HDR 
         WHERE SPEC_CODE = $1`, [userCode]
      );

      if (!user.rows[0] || password !== user.rows[0].item_code) {
        return res
          .status(401)
          .json({ status: "fail", message: "Incorrect User Code or Password" });
      }

      let companydata;
      if (!user.rows[0].user_code) {
        companydata = await client.query(
          `SELECT COMPANY_CODE FROM sl_mst_company WHERE marked IS NULL AND SPEC_CODE = $1`, [userCode]
        );
      } else {
        companydata = await client.query(
          `SELECT COMPANY_CODE FROM sl_mst_company WHERE marked IS NULL AND SPEC_CODE = $1`, [user.rows[0].user_code]
        );
      }

      company = companydata.rows[0]?.company_code;

      const unitdata = await client.query(
        `SELECT site_code, site_desc FROM sl_mst_site WHERE marked IS NULL AND company = $1`, [company]
      );
      unit = unitdata.rows[0]?.site_code;

      const yeardata = await client.query(
        `SELECT year_nm, year_desc FROM fin_mst_year_mst 
         WHERE marked IS NULL AND company_code = $1`, [company]
      );
      finyear = yeardata.rows[0]?.year_nm;

    } else if (userType === "customer") {
      user = await client.query(
        `SELECT S_TAX_NO, C_PORTAL_PWD, DISTRIBUTOR_CODE, ACCOUNT_CODE, COMPANY_CODE, UNIT_CODE, DEALER_CODE 
         FROM SL_MST_DISTRIBUTOR 
         WHERE S_TAX_NO = $1`, [userCode]
      );

      if (!user.rows[0] || password !== user.rows[0].C_PORTAL_PWD) {
        return next(new AppError("Incorrect Tax Number or Password", 401));
      }

    } else if (userType === "vendor") {
      user = await client.query(
        `SELECT SERVICE_TAX, V_PORTAL_PWD, ACCOUNT_CODE, PARTY_CODE, COMPANY_CODE, UNIT_CODE 
         FROM PUR_MST_PARTY 
         WHERE SERVICE_TAX = $1`, [userCode]
      );

      if (!user.rows[0] || password !== user.rows[0].V_PORTAL_PWD) {
        return next(new AppError("Incorrect Service Tax Number or Password", 401));
      }
    }

    // 4) If everything ok, send token to client
    createSendToken(
      user.rows[0],
      userType,
      finyear,
      company,
      unit,
      200,
      req,
      res
    );

  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Internal Server Error" });
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (err) {
        console.error(err);
      }
    }
  }
};




exports.updateUnit = async (req, res) => {
  try {
    const oldToken = req.cookies.jwt || req.headers.authorization?.split(" ")[1];

    if (!oldToken) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET);

    // Remove exp and iat to avoid conflicts
    const { exp, iat, ...cleanedUser } = decoded;

    const updatedUser = {
      ...cleanedUser,
      unit: req.body.newUnit, // Replace unit
    };

    const newToken = jwt.sign(updatedUser, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    // Send updated cookie
    res.cookie("jwt", newToken, {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      sameSite: "None",
      httpOnly: true,
      secure: true,
    });

    res.status(200).json({
      status: "None",
      token: newToken,
      message: "Unit updated successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating unit" });
  }
};

exports.updateUserType = async (req, res) => {
  try {
    const oldToken = req.cookies.jwt || req.headers.authorization?.split(" ")[1];

    if (!oldToken) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET);

    // Remove exp and iat to avoid conflicts
    const { exp, iat, ...cleanedUser } = decoded;

    const  userType  = req.body.user_type;

    if (!userType) {
      return res.status(400).json({ message: "User type is required" });
    }

    const updatedUser = {
      ...cleanedUser,
      userType, // Update user_type
    };

    const newToken = jwt.sign(updatedUser, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.cookie("jwt", newToken, {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      sameSite: "None",
      httpOnly: true,
      secure: true,
    });

    res.status(200).json({
      status: "success",
      token: newToken,
      message: "User type updated successfully",
    });
  } catch (err) {
    console.error("Error updating user type:", err);
    res.status(500).json({ message: "Error updating user type" });
  }
};




// exports.Register = async (req, res, next) => {
//   let client;

//   try {
//     client = new Client({
//       user: process.env.DB_USERNAME,
//       password: process.env.DB_PASSWORD,
//       connectionString: process.env.DB_CONNECTION_STRING,
//     });

//     await client.connect();

//     const {
//       fullName,
//       email,
//       contactNumber,
//       password,
//       confirmPassword,
//       company,
//       terms,
//     } = req.body;

//     console.log(req.body);

//     // Validate inputs
//     if (!fullName || !password || !company || !email) {
//       return next(new AppError("Please provide Email, Password", 400));
//     }

//     // Generate new company_code
//     const generateComId = async () => {
//       const response1 = await client.query(`SELECT MAX(company_code) AS max FROM sl_mst_company`);
//       return Number(response1.rows[0].max) + 1;
//     };

//     const companyCode = await generateComId();

//     // Insert into company table
//     await client.query(
//       `INSERT INTO sl_mst_company (company_code, company_name, spec_code ) VALUES ($1, $2, $3)`,
//       [companyCode, company, email]
//     );

//     // Insert into user table
//     await client.query(
//       `INSERT INTO SL_SEC_SPEC_ITEM_HDR ( SPEC_CODE, ITEM_CODE, COMPANY_CODE, ROLE_CD, contactNumber) 
//        VALUES ($1, encrypt10g($2), $3, $4, $5)`,
//       [email, password, companyCode, 1, contactNumber]
//     );

//     res.status(200).json({ message: "Registration successful!" });

//   } catch (err) {
//     console.error(err);
//     next(new AppError("Registration failed", 500));
//   } finally {
//     if (client) {
//       try {
//         await client.end();
//       } catch (err) {
//         console.error("Failed to close DB connection", err);
//       }
//     }
//   }
// };



exports.Register = async (req, res) => {
  let client;
  try {
    client = new Client({
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      connectionString: process.env.DB_CONNECTION_STRING,
    });

    await client.connect();
    const { fullName, email, contactNumber, password, company } = req.body;

    if (!email || !password || !company || !fullName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

       // ✅ Check if the company already exists
       const companyCheck = await client.query(
        `SELECT company_name FROM sl_mst_company WHERE LOWER(company_name) = LOWER($1)`,
        [company]
      );
  
      if (companyCheck.rows.length > 0) {
        return res.status(409).json({ message: "Company already exists" });
      }

    const { rows } = await client.query(`SELECT MAX(company_code) AS max FROM sl_mst_company`);
    const companyCode = Number(rows[0].max) + 1;

    // Generate new site_code
    const maxCode =await client.query(`SELECT MAX(site_code) AS max FROM sl_mst_site`)

    const siteCode = Number(maxCode.rows[0].max) + 1;

    const maxYearCode = await client.query(`SELECT MAX(year_code) AS max FROM fin_mst_year_mst`)
    const yearCode = Number(maxYearCode.rows[0].max) + 1;

    await client.query(
      `INSERT INTO sl_mst_company (company_code, company_name, spec_code ) VALUES ($1, $2, $3)`,
      [companyCode, company, email]
    );

// to add unit in sl_mst_site with company code

    await client.query('INSERT INTO sl_mst_site (site_code, site_desc, company) VALUES ($1, $2, $3)', [siteCode, 'unit 1', companyCode]);
    await client.query('INSERT INTO fin_mst_year_mst (year_code, year_desc, company_code) VALUES ($1, $2, $3)', [yearCode + 1, '2025-26', companyCode]);
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await client.query(
      `INSERT INTO SL_SEC_SPEC_ITEM_HDR 
        (SPEC_CODE, ITEM_CODE, COMPANY_CODE, ROLE_CD, contactNumber, otp, otp_expiry, is_verified) 
       VALUES ($1, encrypt10g($2), $3, $4, $5, $6, $7, $8)`,
      [email, password, companyCode, 1, contactNumber, otp.toString(), otpExpiry, false]
    );

    await sendVerificationMessage({ fullname: fullName, email, otp });
    res.status(200).json({ message: "OTP sent to email", email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  } finally {
    if (client) await client.end();
  }
};


const generateOtp = () => Math.floor(100000 + Math.random() * 900000); // 6-digit OTP

const sendVerificationMessage = async ({ fullname, email, otp }) => {
  // Set up Nodemailer transporter
  const transporter = nodemailer.createTransport({
    host: "mail.metalzulu.com",     // Your email provider's SMTP server
    name: "mail.metalzulu.com", 
    port: 465,                   // SSL port
    secure: true,                // Set to true for port 465
    auth: {
      user: "imax@metalzulu.com",   // Your email address
      pass: "imax@123.NaS",    // Your email password
    },
   
  });

  const message = `Thank you for using MetalZulu. Please use the following OTP to complete your verification:

Your OTP code is: ${otp}

This code is valid for the next 15 minutes. If you didn't request this, please ignore this email.`;

  try {
    // Send email using Nodemailer
    const info = await transporter.sendMail({
      from: '"MetalZulu" <metalzulu@imax.co.in>',
      to: email,  // User's email
      subject: "Email Verification Code",  // Email subject
      text: message,  // OTP message
    });

    console.log("✅ Email sent:", info.messageId);  // Log successful email sending
  } catch (error) {
    console.error("❌ Error sending email:", error);  // Log if there's an error
    throw error;
  }
};

exports.verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body;
  let client;

  try {
    client = new Client({
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      connectionString: process.env.DB_CONNECTION_STRING,
    });

    await client.connect();

    const result = await client.query(
      `SELECT * FROM SL_SEC_SPEC_ITEM_HDR
       WHERE SPEC_CODE = $1 AND otp = $2 AND otp_expiry > NOW() AND is_verified = false`,
      [email, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    await client.query(
      `UPDATE SL_SEC_SPEC_ITEM_HDR
       SET is_verified = true
       WHERE SPEC_CODE = $1`,
      [email]
    );

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("OTP verification error:", err);
    next(new AppError("OTP verification failed", 500));
  } finally {
    if (client) {
      await client.end();
    }
  }
};


exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};





exports.protect = async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  let client;

  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
      // console.log(token, "prottttttttttttttttttttttttttttt");
    }

    if (!token) {
      return res.status(401).json({
        status: "fail",
        message: "You are not logged in. Please login to get access",
      });
    }
 
    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);


    client = await new Client({
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      connectionString: process.env.DB_CONNECTION_STRING,
    });
    client.connect();
    req.dbConnection = client;


    // 3) Check if user still exists
    let currentUser;
    if (
      console.log(decoded.userType, "iiiiiiiiiiiiiii"),
      decoded.userType === "employee" ||
      decoded.userType === "Procurement Management" ||
      decoded.userType === "Stock Control" ||
      decoded.userType === "Sales" ||
      decoded.userType === "Production" ||
      decoded.userType === "Financial Management" ||
      decoded.userType === "Gate Control" ||
      decoded.userType === "Trasporter" ||
      decoded.userType === "Job Work" ||
      decoded.userType === "Payroll"||
      decoded.userType === "Administrator Module"
    )
     {
      console.log(decoded.id, "iiiiiiiiiiiiiii");
      currentUser = await client.query(
        `SELECT SPEC_CODE, ITEM_CODE, COMPANY_CODE, UNIT_CODE, role_cd FROM SL_SEC_SPEC_ITEM_HDR WHERE SPEC_CODE='${decoded.id}'`
      );
      console.log(currentUser)
    }

    else if (decoded.userType === "customer") {
      currentUser = await client.query(
        `SELECT S_TAX_NO, C_PORTAL_PWD, DISTRIBUTOR_CODE, ACCOUNT_CODE, COMPANY_CODE, UNIT_CODE, DEALER_CODE FROM SL_MST_DISTRIBUTOR WHERE S_TAX_NO='${decoded.id}'`
      );
    } else if (decoded.userType === "vendor") {
      currentUser = await client.query(
        `SELECT SERVICE_TAX, V_PORTAL_PWD, ACCOUNT_CODE, PARTY_CODE, COMPANY_CODE, UNIT_CODE FROM PUR_MST_PARTY WHERE SERVICE_TAX='${decoded.id}'`
      );
    }

    if (!currentUser || !currentUser.rows[0]) {
      return next(
        new AppError(
          "The user belonging to this token does no longer exist.",
          401
        )
      );
    }
    currentUser.rows.userType = decoded.userType;
    currentUser.rows.finyear = decoded.finyear;
    currentUser.rows.company = decoded.company;
    currentUser.rows.unit = decoded.unit;
    req.user = currentUser.rows;

    let permissions;
    if ( decoded.userType === "employee" ||
      decoded.userType === "Procurement Management" ||
      decoded.userType === "Stock Control" ||
      decoded.userType === "Sales" ||
      decoded.userType === "Production" ||
      decoded.userType === "Financial Management" ||
      decoded.userType === "Gate Control" ||
      decoded.userType === "Trasporter" ||
      decoded.userType === "Job Work" ||
      decoded.userType === "Payroll"||
      decoded.userType === "Administrator Module") {
      // console.log(`SELECT lr.*, f.form_name, f.module, f.trans_id
      // FROM sl_sec_login_rights lr
      // LEFT JOIN sl_sec_forms f ON lr.form_id = f.form_id
      // WHERE lr.login_code = '${decoded.id}' AND lr.marked IS NULL
      // ORDER BY f.form_name`)
      permissions = await client.query(
        `SELECT lr.*, f.form_name, f.module, f.trans_id
      FROM sl_sec_login_rights lr
      LEFT JOIN sl_sec_forms f ON lr.form_id = f.form_id
      WHERE lr.login_code = '${decoded.id}' AND lr.marked IS NULL
      ORDER BY f.form_name`
      );
      req.user.PERMISSIONS = permissions.rows;
    }

    res.locals.user = req.user;
   
    next();
  } catch (err) {
    console.error(err);
    res.status(404).json({
      status: "fail",
      message: err,
    });

    if (client) {
      try {
        await client.end();
      } catch (error) {
        console.error(error);
      }
    }
  }
};




exports.checkPermissions = (action) => (req, res, next) => {
  if (!req.user.PERMISSIONS[action]) {
    return next(
      new AppError("You do not have permission to perform this action", 403)
    );
  }

  next();
};




exports.checkUser = (userType) => (req, res, next) => {
  if (req.user.userType !== userType) {
    return res.status(403).json({
      status: "fail",
      message: "You are not authorised to see this data",
    });
  }
  next();
};



exports.isLoggedIn = async (req, res, next) => {
 
  console.log("hiiiiiiiiii");
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (token) {
    let client;
    try {
   
      const decoded = await promisify(jwt.verify)(
        token,
        process.env.JWT_SECRET
      );
    
      client = new Client({
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        connectionString: process.env.DB_CONNECTION_STRING,
      });
      client.connect();
      // 2) Check if user still exists
      let currentUser;
      //  let finYears;
      if (
        decoded.userType === "employee" ||
        decoded.userType === "Procurement Management" ||
        decoded.userType === "Stock Control" ||
        decoded.userType === "Sales" ||
        decoded.userType === "Production" ||
        decoded.userType === "Financial Management" ||
        decoded.userType === "Gate Control" ||
        decoded.userType === "Trasporter" ||
        decoded.userType === "Job Work" ||
        decoded.userType === "Payroll" ||
        decoded.userType === "Administrator Module" 
      ) {
        currentUser = await client.query(
          `SELECT SPEC_CODE, ITEM_CODE, COMPANY_CODE, UNIT_CODE, role_cd FROM SL_SEC_SPEC_ITEM_HDR WHERE SPEC_CODE='${decoded.id}'`
        );

     
      } else if (decoded.userType === "customer") {
        currentUser = await client.query(
          `SELECT S_TAX_NO, C_PORTAL_PWD, DISTRIBUTOR_CODE, ACCOUNT_CODE, COMPANY_CODE, UNIT_CODE, DEALER_CODE FROM SL_MST_DISTRIBUTOR WHERE S_TAX_NO='${decoded.id}'`
        );
      } else if (decoded.userType === "vendor") {
        currentUser = await client.query(
          `SELECT SERVICE_TAX, V_PORTAL_PWD, ACCOUNT_CODE, PARTY_CODE, COMPANY_CODE, UNIT_CODE FROM PUR_MST_PARTY WHERE SERVICE_TAX='${decoded.id}'`
        );
      }

      if (!currentUser) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      currentUser.rows[0].userType = decoded.userType;
      currentUser.rows[0].company = decoded.company;
      currentUser.rows[0].unit = decoded.unit;
      res.locals.user = currentUser.rows[0];
      res.status(200).json({
        status: "success",
        data: {
          user: currentUser,
          //finYears: finYears.rows,
        },
      });
    } catch (err) {
      return next();
    } finally {
      if (client) {
        try {
          await client.end();
        } catch (err) {
          console.error(err);
        }
      }
    }
  }
  next();
};



exports.finYearModule = async (req, res, next) => {
  let client;
  client = new Client({
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    connectionString: process.env.DB_CONNECTION_STRING,
  });
  client.connect();


  const finYears = await client.query(`
  SELECT
  year_code,
  year_nm,
  year_desc,
  timestamptostring(st_date) st_date,
  timestamptostring(end_date) end_date ,
  CASE WHEN date_part('year', CURRENT_DATE) = CAST(SUBSTRING(year_desc, 1, 4) AS double precision) THEN true ELSE false END AS selected
FROM
  fin_mst_year_mst`);
  res.status(200).json({
    status: "success",
    data: {
      finYears: finYears.rows,
    },
  });
};



exports.companyModule = async (req, res, next) => {
  let client;
  client = new Client({
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    connectionString: process.env.DB_CONNECTION_STRING,
  });
  client.connect();



  const companys = await client.query(`select company_code,company_name from sl_mst_company where marked is null`);
  res.status(200).json({
    status: "success",
    data: {
      companys: companys.rows,
    },
  });
};



exports.siteModule = async (req, res, next) => {
  let client;
  client = new Client({
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    connectionString: process.env.DB_CONNECTION_STRING,
  });
  client.connect();
  // const client = req.dbConnection;
  // // // console.log(client);

  const site = await client.query(
    `select site_code, site_desc from sl_mst_site where marked is null`
  );
  res.status(200).json({
    status: "success",
    data: {
      site: site.rows,
    },
  });
};



exports.getUserType = async (req, res, next) => {
  let client;
  client = new Client({
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    connectionString: process.env.DB_CONNECTION_STRING,
  });
  client.connect();


  const userTypes = await client.query(
    `select module_id, module_name from sl_mst_module`
  );
  res.status(200).json({
    status: "success",
    data: {
      userTypes: userTypes.rows,
    },
  });
};



exports.getUserType = async (req, res, next) => {
  let client;
  client = new Client({
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    connectionString: process.env.DB_CONNECTION_STRING,
  });
  client.connect();
  // const client = req.dbConnection;
  // // // console.log(client);

  const userTypes = await client.query(
    `select module_id, module_name from sl_mst_module`
  );
  res.status(200).json({
    status: "success",
    data: {
      userTypes: userTypes.rows,
    },
  });
};



exports.updateMyPassword = wrapper(async (req, res, next) => {
  const client = req.dbConnection;
  if (!req.body.password || req.body.password !== req.body.passwordConfirm) {
    return res.status(400).json({
      status: "fail",
      message: "Password and Confirm Password don't match",
    });
  }

  if (
    (req.user.userType === "employee" ||
      req.user.userType === "payroll" ||
      req.user.userType === "SalesModule" ||
      req.user.userType === "management" ||
      req.user.userType === "salesGuy" ||
      req.user.userType === "productionGuy") &&
    req.user.ITEM_CODE === req.body.currentPassword
  ) {
    await client.query(
      `UPDATE SL_SEC_SPEC_ITEM_HDR SET ITEM_CODE='${req.body.password}' WHERE SPEC_CODE='${req.user.SPEC_CODE}'`
    );
  } else if (
    req.user.userType === "customer" &&
    req.user.C_PORTAL_PWD === req.body.currentPassword
  ) {
    await client.query(
      `UPDATE SL_MST_DISTRIBUTOR SET C_PORTAL_PWD='${req.body.password}' WHERE S_TAX_NO='${req.user.S_TAX_NO}'`
    );
  } else if (
    req.user.userType === "vendor" &&
    req.user.V_PORTAL_PWD === req.body.currentPassword
  ) {
    await client.query(
      `UPDATE PUR_MST_PARTY SET V_PORTAL_PWD='${req.body.password}' WHERE SERVICE_TAX='${req.user.SERVICE_TAX}'`
    );
  } else {
    return res.status(400).json({
      status: "fail",
      message: "The password you entered does not match.",
    });
  }

  createSendToken(req.user, req.user.userType, 200, req, res);
});

// exports.getModulesBySpecCode = wrapper(async (req, res, next) => {
//   let client;
//   try {
//     client = new Client({
//       user: process.env.DB_USERNAME,
//       password: process.env.DB_PASSWORD,
//       connectionString: process.env.DB_CONNECTION_STRING,
//     });
//     await client.connect();
//     console.log(req.body,"reqqqbodyis this fjksdfjksdfjk");
//     const { userCode } = req.body;
//     // Validate spec code
//     if (!userCode) {
//       return res.status(400).json({
//         status: "fail",
//         message: "Usercode is required"
//       });
//     }
//     const roleCheck = await client.query(
//       `SELECT role_cd FROM sl_sec_spec_item_hdr WHERE spec_code = $1`,
//       [userCode]
//     );

//     let moduleRows;
//     if (roleCheck.rows.length > 0 && roleCheck.rows[0].role_cd === '1') {
//       // Role code 1: Full access to all modules
//       moduleRows = await client.query(
//         `SELECT DISTINCT module_id, module_name 
//          FROM sl_mst_module 
//          ORDER BY module_name`
//       );
//     } else {
//       // Role code 2 or other: Check specific module access
//       moduleRows = await client.query(
//         `SELECT DISTINCT m.module_id, m.module_name 
//          FROM sl_mst_module m
//          INNER JOIN sl_sec_spec_item_det d ON d.module::integer = m.module_id
//          INNER JOIN sl_sec_spec_item_hdr h ON h.spec_code = d.spec_cd
//          WHERE d.spec_cd = $1 
//          AND d.marked IS NULL
//          ORDER BY m.module_name`,
//         [userCode]
//       );
//     }
//     console.log('Role check:', roleCheck.rows);
//     console.log('Query result:', moduleRows.rows);

//     res.status(200).json({
//       status: "success",
//       data: moduleRows.rows
//     });
//   } catch (error) {
//     console.error('Error fetching modules:', error);
//     // Test the database connection with a simple query
//     try {
//       const testQuery = await client.query('SELECT COUNT(*) FROM sl_sec_spec_item_det');
//       console.log('Test query result:', testQuery.rows);
      
//       // Log the actual query being executed
//       const debugQuery = await client.query(
//         `SELECT COUNT(*) 
//          FROM sl_mst_module m
//          LEFT JOIN sl_sec_spec_item_det d ON CAST(d.module AS TEXT) = CAST(m.module_id AS TEXT)
//          LEFT JOIN sl_sec_spec_item_hdr h ON h.spec_code = d.spec_cd
//          WHERE d.spec_cd = $1`,
//         [req.body.userCode]
//       );
//       console.log('Debug query result:', debugQuery.rows);
//     } catch (debugError) {
//       console.error('Debug query error:', debugError);
//     }
    
//     res.status(500).json({
//       status: "error",
//       message: "permision error",
//       details: error.message
//     });
//   } finally {
//     if (client) {
//       try {
//         await client.end();
//       } catch (err) {
//         console.error('Error closing client:', err);
//       }
//     }
//   }
// });


// exports.getModulesBySpecCode = wrapper(async (req, res, next) => {
//   let client;
//   try {
//     client = new Client({
//       user: process.env.DB_USERNAME,
//       password: process.env.DB_PASSWORD,
//       connectionString: process.env.DB_CONNECTION_STRING,
//     });
//     await client.connect();
    
//     const { userCode, userType } = req.body;
    
//     if (!userCode || !userType) {
//       return res.status(400).json({
//         status: "fail",
//         message: "Usercode and userType are required"
//       });
//     }
    
//     // console.log('Query 1:', 'SELECT role_cd FROM sl_sec_spec_item_hdr WHERE spec_code = $1', [userCode]);
//     const roleCheck = await client.query(
//       `SELECT role_cd FROM sl_sec_spec_item_hdr WHERE spec_code = $1`,
//       [userCode]
//     );
//     // console.log(roleCheck,"rolecheckfkjsdfkj");
//     let moduleRows;
//     if (roleCheck.rows.length > 0 && roleCheck.rows[0].role_cd === 1) {
//       console.log('Query 2:', 'SELECT DISTINCT module_id, module_name FROM sl_mst_module ORDER BY module_name');
//       moduleRows = await client.query(
//         `SELECT DISTINCT module_id, module_name 
//          FROM sl_mst_module 
//          ORDER BY module_name`
//       );
//     } else {
//       console.log('Query 3:', `SELECT DISTINCT m.module_id, m.module_name 
//          FROM sl_mst_module m
//          INNER JOIN sl_sec_spec_item_det d ON d.module::integer = m.module_id
//          INNER JOIN sl_sec_spec_item_hdr h ON h.spec_code = d.spec_cd
//          WHERE d.spec_cd = $1 
//          AND d.marked IS NULL
//          ORDER BY m.module_name`, [userCode]);
//       moduleRows = await client.query(
//         `SELECT DISTINCT m.module_id, m.module_name 
//          FROM sl_mst_module m
//          INNER JOIN sl_sec_spec_item_det d ON d.module::integer = m.module_id
//          INNER JOIN sl_sec_spec_item_hdr h ON h.spec_code = d.spec_cd
//          WHERE d.spec_cd = $1 
//          AND d.marked IS NULL
//          ORDER BY m.module_name`,
//         [userCode]
//       );
//     }

//     // console.log('Query results:', moduleRows.rows);

//     const hasAccess = moduleRows.rows.some(module => module.module_name.toLowerCase() === userType.toLowerCase());
    
//     if (hasAccess) {
//       req.userModules = moduleRows.rows;
//       next();
//     } else {
//       res.status(403).json({
//         status: "fail",
//         message: "You do not have access to the specified userType",
//         redirect: "/signin"
//       });
//     }
//   } catch (error) {
//     console.error('Error during login:', error);
//     res.status(500).json({
//       status: "error",
//       message: "An error occurred during login",
//       details: error.message,
//       redirect: "/signin"
//     });
//   } finally {
//     if (client) {
//       try {
//         await client.end();
//       } catch (err) {
//         console.error('Error closing client:', err);
//       }
//     }
//   }
// });
exports.getModulesBySpecCode = wrapper(async (req, res, next) => {
  let client;
  try {
    client = new Client({
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      connectionString: process.env.DB_CONNECTION_STRING,
    });
    await client.connect();

    const { userCode, userType } = req.body;

    if (!userCode || !userType) {
      return res.status(400).json({
        status: "fail",
        message: "Usercode and userType are required"
      });
    }

    // ✅ Skip module check for Super Admin
    if (userCode === 'sk@imax.co.in') {
      const allModules = await client.query(
        `SELECT DISTINCT module_id, module_name 
         FROM sl_mst_module 
         ORDER BY module_name`
      );

      req.userModules = allModules.rows;
      return next();
    }

    const roleCheck = await client.query(
      `SELECT role_cd FROM sl_sec_spec_item_hdr WHERE spec_code = $1`,
      [userCode]
    );

    let moduleRows;
    if (roleCheck.rows.length > 0 && roleCheck.rows[0].role_cd === 1) {
      moduleRows = await client.query(
        `SELECT DISTINCT module_id, module_name 
         FROM sl_mst_module 
         ORDER BY module_name`
      );
    } else {
      moduleRows = await client.query(
        `SELECT DISTINCT m.module_id, m.module_name 
         FROM sl_mst_module m
         INNER JOIN sl_sec_spec_item_det d ON d.module::integer = m.module_id
         INNER JOIN sl_sec_spec_item_hdr h ON h.spec_code = d.spec_cd
         WHERE d.spec_cd = $1 
         AND d.marked IS NULL
         ORDER BY m.module_name`,
        [userCode]
      );
    }

    const hasAccess = moduleRows.rows.some(
      module => module.module_name.toLowerCase() === userType.toLowerCase()
    );

    if (hasAccess) {
      req.userModules = moduleRows.rows;
      next();
    } else {
      res.status(403).json({
        status: "fail",
        message: "You do not have access to the specified userType",
        redirect: "/signin"
      });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      status: "error",
      message: "An error occurred during login",
      details: error.message,
      redirect: "/signin"
    });
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (err) {
        console.error('Error closing client:', err);
      }
    }
  }
});


exports.getSubscriptionPlanInfoprice= async (req, res, next) => {
 
  const { code } = req.params;

  let client;

    client = new Client({
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      connectionString: process.env.DB_CONNECTION_STRING,
    });
    await client.connect();

  try {
    const result = await client.query(
      `SELECT u.plan_id, p.price
       FROM SL_SEC_SPEC_ITEM_HDR u
       LEFT JOIN plans p ON u.plan_id = p.plan_id
       WHERE u.spec_code = $1`,
      [code]  // ✅ Safe parameterized query
    );

    if (result.rows.length === 0) {
      return res.status(202).json({ message: "User not found" });
    }

    const { plan_id, price } = result.rows[0];

    // 👇 Subscription logic
    const isSubscribed = !!plan_id && price > 0;

    res.json({ subscribed: isSubscribed });
  } catch (error) {
    console.error("Error checking subscription plan:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// exports.getPlanInfo= async (req, res, next) => {
 
//   const { code } = req.params;

//   let client;

//     client = new Client({
//       user: process.env.DB_USERNAME,
//       password: process.env.DB_PASSWORD,
//       connectionString: process.env.DB_CONNECTION_STRING,
//     });
//     await client.connect();

//   try {
//     const result = await client.query(
//       `SELECT u.plan_id, p.price
//        FROM SL_SEC_SPEC_ITEM_HDR u
//        LEFT JOIN plans p ON u.plan_id = p.plan_id
//        WHERE u.user_code = $1`,
//       [code]  // ✅ Safe parameterized query
//     );

//     if (result.rows.length === 0) {
//       return res.status(202).json({ message: "User not found" });
//     }

//     const { plan_id, price } = result.rows[0];

//     // 👇 Subscription logic
//     const isSubscribed = !!plan_id && price > 0;

//     res.json({ subscribed: isSubscribed });
//   } catch (error) {
//     console.error("Error checking subscription plan:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };


exports.getPlanInfoMessage = async (req, res, next) => {
  const { Client } = require('pg');
  let client;

  client = new Client({
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    connectionString: process.env.DB_CONNECTION_STRING,
  });

  await client.connect();
console.log(req.user, "eryyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy")
  try {
    const result = await client.query(`
      SELECT 
        p.plan_id, 
        p.plan_name, 
        p.price, 
        pm.module_id, 
        GET_MODULE(pm.module_id) as get_module 
      FROM plans p
      JOIN plan_modules pm ON p.plan_id = pm.plan_id
    `);

    const plans = {};

    for (const row of result.rows) {
      let key = '';
      if (row.plan_name === 'Starter Plan') key = 'starter';
      else if (row.plan_name === 'Professional Plan') key = 'professional';
      else if (row.plan_name === 'Enterprise Plan') key = 'enterprise';
      else continue;

      if (!plans[key]) {
        plans[key] = {
          id:row.plan_id,
          amount: row.price ,
          name: row.plan_name,
          tagline: '',
          highlight: '',
          modules: [],
        };
      }

      plans[key].modules.push(row.get_module);
    }

    // Add tagline and highlight
    if (plans.starter) {
      plans.starter.tagline = 'Perfect for small businesses';
      plans.starter.highlight = 'Most Affordable';
    }
    if (plans.professional) {
      plans.professional.tagline = 'Ideal for growing companies';
      plans.professional.highlight = 'Most Popular';
    }
    if (plans.enterprise) {
      plans.enterprise.tagline = 'For large organizations';
      plans.enterprise.highlight = 'Most Features';
    }

    // Add custom plan
    plans.custom = {
      name: 'Custom Plan',
      tagline: 'Tailored to your needs',
      highlight: 'Most Flexible',
      modules: [
        'Custom Module Selection',
        'Tailored Integration',
        'All Enterprise Modules Available',
        'Custom Development',
      ],
    };
// console.log(plans,"planinfo")
    res.json(plans);
  } catch (error) {
    console.error("Error checking subscription plan:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    await client.end();
  }
};

exports.payment = async (req, res, next) => { 
  const { Client } = require('pg');
  const client = new Client({
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    connectionString: process.env.DB_CONNECTION_STRING,
  });

  console.log(req.body);
  await client.connect();

  try {
    const { plan_id, user_code, amount } = req.body;

    // Step 1: Insert into payments
    const result = await client.query(`
      INSERT INTO payments (
        amount,
        currency,
        payment_method,
        payment_status,
        transaction_id,
        payment_date,
        billing_period_start,
        billing_period_end,
        invoice_number,
        invoice_url,
        subscription_id,
        user_code
      ) VALUES (
        $1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, $11
      ) RETURNING *;
    `, [
      amount,
      'USD',              // currency
      'Razorpay',         // payment_method
      'Completed',        // payment_status (assuming it's successful)
      'txn_' + Date.now(),// mock transaction_id
      null,               // billing_period_start
      null,               // billing_period_end
      null,               // invoice_number
      null,               // invoice_url
      plan_id,            // subscription_id
      user_code           // user_code
    ]);

    const paymentData = result.rows[0];

    // Step 2: Update the user's plan in SL_SEC_SPEC_ITEM_HDR
    await client.query(`
      UPDATE SL_SEC_SPEC_ITEM_HDR
      SET plan_id = $1
      WHERE spec_code = $2;
    `, [plan_id, user_code]);

    res.json({
      success: true,
      message: 'Payment recorded and plan updated successfully',
      payment: paymentData
    });

  } catch (error) {
    console.error("Error in payment:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    await client.end();
  }
};




