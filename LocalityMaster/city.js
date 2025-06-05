import { useEffect, useContext, useState } from "react";
import axios from "axios";
import classes from "../Pages.module.css";
import { Skeleton, Row, Col, message, Tooltip, Modal, Button } from "antd";
import { Form, Input } from "antd";
import { AiFillDelete } from "react-icons/ai";
import { FaPenAlt } from "react-icons/fa";
import DataContext from "../../../Context/dataContext";
import EmployeeTable from "../EmployeeTable/EmployeeTable";
import FormRenderer from "./FormRenderer";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { notification } from "antd";

const Misc = (props) => {
  console.log(props.data, "uom");
  const { id1 } = useParams();
  const employeeData = useContext(DataContext);
  const [visible, setVisible] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null);
  const [urows, setURows] = useState(true);
  const [vrows, setVRows] = useState(true);
  const [uform, setUForm] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [id, setID] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [allData, setAllData] = useState({
    localityHeader: [
      {
        description: null,
        city_code: null,
      },
    ],
  });
  const [allData1, setAllData1] = useState({
    localityHeader: [
      {
        description: null,
        city_code: null,
      },
    ],
  });
  const [mata, setMata] = useState({
    localityHeader: [
      {
        description: null,
        city_code: null,
      },
    ],
  });
  const [ad, setAD] = useState(null);

  const deleteHandler = (event, code) => {
    console.log(identifier, code);
    // console.log(kkoko, "yty");
    setLoading(true);

    axios
      .delete(employeeData.URL + "/api/v1/locality/" + code.toString(), {
        withCredentials: true,
      })
      .then((response) => {
        message.success({
          content: "Record Deleted Successfully!!!!",
          className: "custom-class",
          style: {
            marginTop: "20vh",
          },
        });
        setLoading(false);
        setRows(null);

        axios
          .get(employeeData.URL + "/api/v1/locality/", {
            withCredentials: true,
          })
          .then((response) => {
            setRows((rows) => {
              let newRows = response.data.data.locality.rows.map(
                (row, index) => {
                  return {
                    E: (
                      <Tooltip placement="bottom" title="Edit" color="#1777C4">
                        <Link
                          to="#"
                          style={{ color: "#1777C4", fontWeight: "bolder" }}
                          onClick={(event) =>
                            editHandler(
                              event,
                              index,
                              //   response.data.data.tableHeader.row_identifier,
                              row["locality_code"]
                              //   response.data.data.tableHeader.master_fields
                            )
                          }
                        >
                          <FaPenAlt
                            style={{ color: "#1777C4", fontWeight: "bolder" }}
                          />
                        </Link>
                      </Tooltip>
                    ),
                    D: (
                      <Tooltip placement="bottom" title="Delete" color="red">
                        <Link
                          to="#"
                          style={{ color: "red", fontWeight: "bolder" }}
                          onClick={(event) =>
                            deleteHandler(
                              event,
                              //   response.data.data.tableHeader.row_identifier,
                              row["locality_code"]
                            )
                          }
                        >
                          <AiFillDelete
                            style={{ color: "red", fontWeight: "bolder" }}
                          />
                        </Link>
                      </Tooltip>
                    ),
                    SNO: index + 1,
                    ...row,
                  };
                }
              );
              return newRows;
            });
          })
          .catch((err) => {
            console.log(err);
          });
      })
      .catch((err) => {
        message.error({
          content: "Some Error Occurred!!!!",
          className: "custom-class",
          style: {
            marginTop: "20vh",
          },
        });
        setLoading(false);
      });
  };
  useEffect(() => {
    setTitle("");
    setForm((form) => {
      const newForm = null;
      return newForm;
    });
    setID("");
    setIdentifier("");
    setRows(null);
    setColumns([]);
    setLoading(false);
    setAD(null);

    axios
      .get(employeeData.URL + "/api/v1/locality/", {
        withCredentials: true,
      })
      .then((response) => {
        console.log(response);
        // setTitle((title) => {
        //   const newTitle = response.data.data.tableHeader.form_name;
        //   return newTitle;
        // });

        setColumns((columns) => {
          let newCols = response.data.data.locality.fields.map((col) => {
            return {
              name: col.name,
              title: col.name.split("_").join(" ").toLowerCase(),
            };
          });

          const newNewCols = [
            { name: "E", title: "E" },
            { name: "D", title: "D" },
            { name: "SNO", title: "SNo" },
            ...newCols,
          ];
          return newNewCols;
        });

        setRows((rows) => {
          let newRows = response.data.data.locality.rows.map((row, index) => {
            return {
              E: (
                <Tooltip placement="bottom" title="Edit" color="#1777C4">
                  <Link
                    to="#"
                    style={{ color: "#1777C4", fontWeight: "bolder" }}
                    onClick={(event) =>
                      editHandler(
                        event,
                        index,
                        // response.data.data.tableHeader.row_identifier,
                        row["locality_code"],
                        response.data.data.locality.rows
                      )
                    }
                  >
                    <FaPenAlt
                      style={{ color: "#1777C4", fontWeight: "bolder" }}
                    />
                  </Link>
                </Tooltip>
              ),
              D: (
                <Tooltip placement="bottom" title="Delete" color="red">
                  <Link
                    to="#"
                    style={{ color: "red", fontWeight: "bolder" }}
                    onClick={(event) =>
                      deleteHandler(
                        event,
                        // response.data.data.tableHeader.row_identifier,
                        row["locality_code"]
                      )
                    }
                  >
                    <AiFillDelete
                      style={{ color: "red", fontWeight: "bolder" }}
                    />
                  </Link>
                </Tooltip>
              ),
              SNO: index + 1,
              ...row,
            };
          });

          return newRows;
        });

        // setForm((form) => {
        //   let inputTypes =
        //     response.data.data.tableHeader.input_type.split(", ");
        //   const newForm = response.data.data.tableHeader.table_fields
        //     .split(", ")
        //     .map((field, index) => {
        //       if (inputTypes[index] === "Input")
        //         return {
        //           value: "",
        //           label: response.data.data.tableHeader.labels
        //             .split(", ")
        //             [index].split("_")
        //             .join(" "),
        //           name: field,
        //           type: "Input",
        //         };

        //       if (inputTypes[index] === "Date")
        //         return {
        //           value: "",
        //           label: response.data.data.tableHeader.labels
        //             .split(", ")
        //             [index].split("_")
        //             .join(" "),
        //           name: field,
        //           type: "Date",
        //         };

        //       if (inputTypes[index] === "Select")
        //         return {
        //           value: "",
        //           label: response.data.data.tableHeader.labels
        //             .split(", ")
        //             [index].split("_")
        //             .join(" "),
        //           name: field,
        //           type: "Select",
        //           options: response.data.data.tableHeader.select_lists
        //             .split(";")
        //             [index].split(", ")
        //             .map((item) => {
        //               return {
        //                 key: item,
        //                 name: item,
        //               };
        //             }),
        //         };

        //       return {
        //         value: "",
        //         label: response.data.data.tableHeader.labels
        //           .split(", ")
        //           [index].split("_")
        //           .join(" "),
        //         name: field,
        //         type: "Master",
        //         options: response.data.data.obj[index],
        //       };
        //     });

        //   console.log(newForm);
        //   return newForm;
        // });
      })
      .catch((err) => {
        console.log(err);
      });

    axios
      .get(employeeData.URL + "/api/v1/locality/additional-data", {
        withCredentials: true,
      })
      .then((response) => {
        console.log(response);
        setAD((ad) => {
          let newad = response.data.data;
          return {
            ...newad,
          };
        });
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  const editHandler = (event, mainindex, code, newRows) => {
   
    console.log("vandna");
    console.log("Edit button clicked",newRows);
    console.log(newRows, "kdkdkdkdkdkdkkd");
    setVRows(false);
    const rowData = newRows[mainindex];
    console.log(rowData,"kdfjskfjdskfjdskfdsj");

    const transformedData = {
      localityHeader: [
        {
          description: rowData.locality,
          city_code: rowData.city_code,
        },
      ],
    };

    setAllData1(transformedData);
    setID(code);
    
    setVisible(true);
  };

  const validateAllData = (allData) => {
    const cityHeaderData = allData.localityHeader[0];
    let formValid = true;

    // Check if any of the required fields in cityHeaderData are null or empty
    if (!cityHeaderData.description || !cityHeaderData.city_code) {
      notification.error({
        message: "Missing Required Fields",
        description:
          "Please fill in all the required fields in the city header.",
        duration: 5,
      });
      formValid = false;
    }

    return formValid;
  };

  const handleSubmit = (event) => {
    // console.log(allData);
    const postData = {
      ...allData,
    };
    event.preventDefault(); // Prevent default form submission

    if (!validateAllData(allData)) {
      return;
    }

    console.log(postData);
    setLoading(true);
    axios
      .post(employeeData.URL + "/api/v1/locality/create-locality", postData, {
        withCredentials: true,
        credentials: "include",
      })
      .then((response) => {
        console.log(response);
        // Check the response for success
        if (response.data.status === "success") {
          // Display success message
          message.success({
            content: "Record Added Successfully!!!!",
            className: "custom-class",
            style: {
              marginTop: "20vh",
            },
          });
        } else {
          // Display error message for duplicate data
          message.error({
            content: response.data.message || "Error adding record.",
            className: "custom-class",
            style: {
              marginTop: "20vh",
            },
          });
        }

        setRows(null);
        setLoading(false);
        
        setAllData((prevData) => ({
          ...prevData,
          localityHeader: [{ description: "", city_code: "" }],
        }));

        axios
          .get(employeeData.URL + "/api/v1/locality/", {
            withCredentials: true,
          })
          .then((response) => {
            console.log(response.data.data.locality.rows);
            setRows((rows) => {
              let newRows = response.data.data.locality.rows.map(
                (row, index) => {
                  return {
                    E: (
                      <Tooltip placement="bottom" title="Edit" color="#1777C4">
                        <Link
                          to="#"
                          style={{ color: "#1777C4", fontWeight: "bolder" }}
                          onClick={(event) =>
                            editHandler(
                              event,
                              index,
                              //   response.data.data.tableHeader.row_identifier,
                              row["locality_code"],
                              response.data.data.locality.rows
                              //   response.data.data.tableHeader.master_fields
                            )
                          }
                        >
                          <FaPenAlt
                            style={{ color: "#1777C4", fontWeight: "bolder" }}
                          />
                        </Link>
                      </Tooltip>
                    ),
                    D: (
                      <Tooltip placement="bottom" title="Delete" color="red">
                        <Link
                          to="#"
                          style={{ color: "red", fontWeight: "bolder" }}
                          onClick={(event) =>
                            deleteHandler(
                              event,
                              //   response.data.data.tableHeader.row_identifier,
                              row["locality_code"]
                            )
                          }
                        >
                          <AiFillDelete
                            style={{ color: "red", fontWeight: "bolder" }}
                          />
                        </Link>
                      </Tooltip>
                    ),
                    SNO: index + 1,
                    ...row,
                  };
                }
              );
              return newRows;
            });
          })
          .catch((err) => {
            console.log(err);
          });
      })
      .catch((err) => {
        setLoading(false);

        message.error({
          content: "please fill all feild!!!!",
          className: "custom-class",
          style: {
            marginTop: "20vh",
          },
        });
      });
  };

  const handleOk = () => {
    // setConfirmLoading(true);
    console.log(allData1);
    const postData = {
      ...allData1,
    };

    console.log(postData);

    axios
      .patch(employeeData.URL + "/api/v1/locality/" + id.toString(), postData, {
        withCredentials: true,
        credentials: "include",
      })
      .then((response) => {
        console.log(response);
        setConfirmLoading(false);
        setVisible(false);

        message.success({
          content: "Record update Successfully!!!!",
          className: "custom-class",
          style: {
            marginTop: "20vh",
          },
        });
        setRows(null);
        setLoading(false);
        setID("");
        setIdentifier("");

        

        axios
          .get(employeeData.URL + "/api/v1/locality/", {
            withCredentials: true,
          })
          .then((response) => {
            setRows((rows) => {
              let newRows = response.data.data.locality.rows.map(
                (row, index) => {
                  return {
                    E: (
                      <Tooltip placement="bottom" title="Edit" color="#1777C4">
                        <Link
                          to="#"
                          style={{ color: "#1777C4", fontWeight: "bolder" }}
                          onClick={(event) =>
                            editHandler(
                              event,
                              index,
                              //   response.data.data.tableHeader.row_identifier,
                              row["locality_code"],
                              response.data.data.locality.rows
                            )
                          }
                        >
                          <FaPenAlt
                            style={{ color: "#1777C4", fontWeight: "bolder" }}
                          />
                        </Link>
                      </Tooltip>
                    ),
                    D: (
                      <Tooltip placement="bottom" title="Delete" color="red">
                        <Link
                          to="#"
                          style={{ color: "red", fontWeight: "bolder" }}
                          onClick={(event) =>
                            deleteHandler(
                              event,
                              //   response.data.data.tableHeader.row_identifier,
                              row["locality_code"]
                            )
                          }
                        >
                          <AiFillDelete
                            style={{ color: "red", fontWeight: "bolder" }}
                          />
                        </Link>
                      </Tooltip>
                    ),
                    SNO: index + 1,
                    ...row,
                  };
                }
              );
              return newRows;
            });
          })
          .catch((err) => {
            console.log(err);
          });
      })
      .catch((err) => {
        setLoading(false);
        setConfirmLoading(false);
        message.error({
          content: "Some Error Occurred!!!!",
          className: "custom-class",
          style: {
            marginTop: "20vh",
          },
        });
      });
  };

  const handleCancel = () => {
    setMata((prevData) => {
      console.log("Previous data:", prevData);
      return {
        ...prevData,
        localityHeader: [{ uom: "" }],
      };
    });
    setVisible(false);
    setConfirmLoading(false);
    axios
      .get(employeeData.URL + "/api/v1/locality/", {
        withCredentials: true,
      })
      .then((response) => {
        setLoading(false);

        // let inputTypes = response.data.data.tableHeader.input_type.split(", ");

        let newRows = response.data.data.locality.rows.map((row, index) => {
          return {
            E: (
              <Tooltip placement="bottom" title="Edit" color="#1777C4">
                <Link
                  to="#"
                  style={{ color: "#1777C4", fontWeight: "bolder" }}
                  onClick={(event) =>
                    editHandler(
                      event,
                      index,

                      row["locality_code"],
                      response.data.data.locality.rows
                    )
                  }
                >
                  <FaPenAlt
                    style={{ color: "#1777C4", fontWeight: "bolder" }}
                  />
                </Link>
              </Tooltip>
            ),
            D: (
              <Tooltip placement="bottom" title="Delete" color="red">
                <Link
                  to="#"
                  style={{ color: "red", fontWeight: "bolder" }}
                  onClick={(event) =>
                    deleteHandler(
                      event,

                      row["locality_code"]
                    )
                  }
                >
                  <AiFillDelete
                    style={{ color: "red", fontWeight: "bolder" }}
                  />
                </Link>
              </Tooltip>
            ),
            SNO: index + 1,
            ...row,
          };
        });
        setRows(newRows);
        setLoading(false);
      });

    // setAllData1({
    //   ...allData1,
    //   uomHeader: [{ uom: (element.value = "") }],
    // });
  };

  return (
    <>
      <Modal
        title="Edit Record"
        visible={visible}
        onOk={handleOk}
        confirmLoading={confirmLoading}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={confirmLoading}
            onClick={handleOk}
          >
            Submit
          </Button>,
        ]}
      >

        {ad ? (
          <FormRenderer
            loading={loading}
            form={uform}
            setForm={setUForm}
            handleSubmit={handleOk}
            save={false}
            setData={setAllData1}
            data={allData1.localityHeader[0]}
            setURows={setURows}
            urows={urows}
            vrows={vrows}
            ad={ad}
          />
        ) : (
          <p>Loading...</p> // Or any other fallback UI
        )}
      </Modal>
      <Row className={classes["Row"]}>
        <Col md={14}>
          <p className={classes["Title"]}>Locality Master</p>
        </Col>
        <Col className={classes["Col"]} md={10}></Col>
      </Row>
      <p></p>

      {ad ? (
        <FormRenderer
          loading={loading}
          form={form}
          setForm={setForm}
          handleSubmit={handleSubmit}
          save={true}
          setData={setAllData}
          data={allData.localityHeader[0]}
          urows={urows}
          vrows={vrows}
          ad={ad}
        />
      ) : (
        <p>Loading...</p> // Or any other fallback UI
      )}
      <hr></hr>
      <p></p>
      {rows && columns.length > 0 ? (
        <EmployeeTable
          val={false}
          data={rows}
          columns={columns}
          deleteHandler={deleteHandler}
        />
      ) : (
        <>
          <Skeleton active={true} />
          <Skeleton active={true} />
          <Skeleton active={true} />
          <Skeleton active={true} />
        </>
      )}
    </>
  );
};

export default Misc;
