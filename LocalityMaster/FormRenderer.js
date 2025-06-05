import React from "react";
import { Row, Col, Form, Input, Select } from "antd"; // Import Select from Ant Design
import classes from "../Pages.module.css";
import { useEffect, useContext, useState } from "react";

const { Option } = Select; // Destructure Option from Select

const FormRenderer = (props) => {
  console.log(props, "dfdff");
  const handleChange = (e, param) => {
    console.log(e.target.value);
    console.log(param);
    props.setData((data) => {
      const newdata = [...data["localityHeader"]];
      console.log(newdata);
      newdata[0][param] = e.target.value;
      return {
        ...data,
        localityHeader: newdata,
      };
    });
  };

  const handleSelectChange = (value, param) => {
    console.log(value);
    console.log(param);
    props.setData((data) => {
      const newdata = [...data["localityHeader"]];
      console.log(newdata);
      newdata[0][param] = value;
      return {
        ...data,
        localityHeader: newdata,
      };
    });
  };

  const handleAddRecord = () => {
    console.log(props.data);
  };

  return (
    <Row className={classes["RowDE"]}>
      <Col lg={6} md={4} className={classes["Col"]}>
        <Form layout="vertical">
          <Form.Item
            label={
              <div
                style={{
                  padding: "0rem 0.5rem",
                  fontSize: "0.7rem",
                  fontWeight: "bold", // Adding fontWeight bold
                }}
              >
                Locality
              </div>
            }
            colon={false}
            style={{ margin: "0", padding: "0" }}
          >
            <Input
              placeholder="Enter Locality Name"
              value={
                props.save ? props.data.description : props.data.description
              }
              onChange={(e) => handleChange(e, "description")}
              bordered={false}
              style={{
                width: "100%",
                backgroundColor: "white",
                boxShadow: "rgba(100, 100, 111, 0.2) 0px 7px 29px 0px",
              }}
            />
          </Form.Item>
        </Form>
      </Col>

      <Col lg={6} md={4} className={classes["Col"]}>
        <Form layout="vertical">
          <Form.Item
            label={
              <div
                style={{
                  padding: "0rem 0.5rem",
                  fontSize: "0.7rem",
                  fontWeight: "bold",
                }}
              >
                City
              </div>
            }
            colon={false}
            style={{ margin: "0", padding: "0" }}
          >
            <Select
              placeholder="Select City"
              value={props.save ? props.data.city_code : props.data.city_code}
              onChange={(value) => handleSelectChange(value, "city_code")}
              style={{ width: "100%" }}
            >
              {props.ad.CITY_CODE.rows.map((option) => (
                <Option
                  style={{ textTransform: "capitalize", color: "#1777C4" }}
                  key={option[props.ad.CITY_CODE.fields[0].name]}
                  value={option[props.ad.CITY_CODE.fields[0].name]}
                >
                  {option[props.ad.CITY_CODE.fields[1].name]}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Col>

      <Col span={8} style={{ margin: "auto" }}>
        {props.save ? (
          <button
            onClick={(event) => props.handleSubmit(event)}
            className={classes["ProfileButtonF"]}
          >
            Add Record
          </button>
        ) : null}
      </Col>
    </Row>
  );
};

export default FormRenderer;
