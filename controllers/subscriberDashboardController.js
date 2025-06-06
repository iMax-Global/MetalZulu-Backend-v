/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
const { Client } = require("pg");
const wrapper = require("../utils/wrapper");



exports.dashboarddata = wrapper(async (req, res, next) => {
  const client = req.dbConnection;

  const card1 = await client.query(
    ` SELECT 
    TO_CHAR(payment_date, 'YYYY-MM') AS month,
    SUM(amount) AS total_revenue
FROM payments
GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
ORDER BY month`
  );

 const card2 = await client.query(
    ` SELECT 
    TO_CHAR(payment_date, 'YYYY-MM') AS month,
    SUM(amount) AS total_revenue
FROM payments
GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
ORDER BY month`
  );

   const card3 = await client.query(
    ` SELECT 
    TO_CHAR(payment_date, 'YYYY-MM') AS month,
    SUM(amount) AS total_revenue
FROM payments
GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
ORDER BY month`
  );


  res.status(200).json({
    status: "success",
    data: {
      card1,
      card2,
      card3
    },
  });
});

