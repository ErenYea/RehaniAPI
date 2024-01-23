const { PDFDocument, Unit } = require("pdf-lib");
const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_BUCKET_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.AWS_BUCKET_SECRET_ACCESS_KEY || "",
});

const renameFields = async (data) => {
  const response = await fetch(data.inputPath);
  const pdfBuffer = await response.arrayBuffer();

  // Load the PDF document
  var pdfDoc = await PDFDocument.load(pdfBuffer);
  var form = pdfDoc.getForm();
  for (let i = 0; i < data.oldFields.length; i++) {
    const textField = form.getField(data.oldFields[i]);
    const fieldType = textField.constructor.name;
    if (textField) {
      const widgets = textField.acroField.getWidgets();
      let props = [];
      widgets.forEach((w) => {
        if (fieldType == "PDFRadioGroup") {
          var value = w.getOnValue();
        }
        // console.log(w.get);
        const rect = w.getRectangle();
        let page = pdfDoc.getPages().find((p) => p.ref === w.P());
        //   console.log(page);
        if (fieldType == "PDFRadioGroup") {
          props.push({
            dimensions: rect,
            page: page,
            value: value.encodedName,
          });
        } else {
          props.push({ dimensions: rect, page: page });
        }
        // console.log(rect);
      });
      form.removeField(textField);
      if (fieldType == "PDFRadioGroup") {
        const radiogroup = form.createRadioGroup(data.newFields[i]);
        props.forEach((prop) => {
          radiogroup.addOptionToPage(
            prop.value.replace("/", ""),
            prop.page,
            prop.dimensions
          );
        });
      } else if (fieldType == "PDFTextField") {
        const textfield = form.createTextField(data.newFields[i]);
        props.forEach((prop) => {
          let dimensions = prop.dimensions;
          textfield.addToPage(prop.page, {
            ...dimensions,
            borderWidth: 0,
          });
        });
      } else if (fieldType == "PDFCheckBox") {
        const textfield = form.createCheckBox(data.newFields[i]);
        props.forEach((prop) => {
          let dimensions = prop.dimensions;
          textfield.addToPage(prop.page, {
            ...dimensions,
            borderWidth: 0,
          });
        });
      }
      const modifiedPdfBytes = await pdfDoc.save();
      try {
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: data.outputPath,
          Body: modifiedPdfBytes,
          ContentType: "application/pdf",
        };
        const uploadResponse = await s3.upload(params).promise();
        console.log("PDF uploaded successfully:", uploadResponse);
        const fileUrl = `${s3BaseUrl}/${process.env.AWS_BUCKET_NAME}/${data.outputPath}`;

        return {
          success: true,

          fileURL: fileUrl,
        };
      } catch (error) {
        console.error("Error uploading PDF:", error);
        return {
          success: false,
          error: error,
        };
      }
    } else {
      continue;
    }
  }
  return {
    success: false,
    message: "Fields not found",
  };
};

module.exports = renameFields;
