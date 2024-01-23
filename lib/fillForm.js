const { PDFDocument, Unit } = require("pdf-lib");
const AWS = require("aws-sdk");
const getFields = require("./getFields");
require("aws-sdk/lib/maintenance_mode_message").suppress = true;

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_BUCKET_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.AWS_BUCKET_SECRET_ACCESS_KEY || "",
});

const fillForm = async (data) => {
  const response = await fetch(data.inputPath);
  const pdfBuffer = await response.arrayBuffer();
  var pdfDoc = await PDFDocument.load(pdfBuffer);
  var form = pdfDoc.getForm();
  let results = [];
  for (let i = 0; i < data.fieldNames.length; i++) {
    const textField = form.getField(data.fieldNames[i]);
    const fieldType = textField.constructor.name;
    if (textField) {
      if (fieldType == "PDFTextField") {
        textField.setText(data.fieldValues[i]);
      } else if (fieldType == "PDFRadioGroup") {
        textField.select(data.fieldValues[i]);
      } else if (fieldType == "PDFCheckBox") {
        if (data.fieldValues[i]) {
          textField.check();
        }
      }
      results.push({
        success: true,
        message: "Field filled",
        field: data.fieldNames[i],
      });
    } else {
      results.push({
        success: false,
        message: "Field Not found",
        field: data.fieldNames[i],
      });
    }
  }
  const modifiedPdfBytes = await pdfDoc.save();
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: data.outputPath,
    Body: modifiedPdfBytes,
    ContentType: "application/pdf",
  };
  const uploadResponse = await s3.upload(params).promise();
  console.log("PDF uploaded successfully:", uploadResponse);
  const fileUrl = `${process.env.S3_BASE_URL}${data.outputPath}`;
  let textFields = await getFields(data, true);
  let props = [];
  for (let i = 0; i < data.signatureFields.length; i++) {
    const textField = form.getField(data.signatureFields[i].name);
    if (textField) {
      const widgets = textField.acroField.getWidgets();

      widgets.forEach((w) => {
        const rect = w.getRectangle();
        let page = pdfDoc.getPages().find((p) => p.ref === w.P());

        let pageSize = page.getSize();

        let resolution = 72; // Assuming 72 DPI if not specified in PDF
        let conversionFactor = 72 / resolution;
        const rectInPixels = {
          x: rect.x * conversionFactor,
          y:
            pageSize.height -
            rect.y * conversionFactor -
            rect.height * conversionFactor,
          width: rect.width * conversionFactor,
          height: rect.height * conversionFactor,
        };

        let pageIndex = pdfDoc.getPages().findIndex((p) => p.ref === w.P());

        let factorY = 1.32;
        let factorX = 1.37;
        // let Xadd = 30;
        // let Yadd = 200;
        // 5.340990535697877 y factor
        // 1.371002448616161 x factor
        props.push({
          page: pageIndex + 1,
          x: rectInPixels.x * factorX,
          y: rectInPixels.y * factorY,
          placeholder_id: data.signatureFields[i].placeholder_id,
          required: true,
          fixed_width: false,
          lock_sign_date: false,
          type: data.signatureFields[i].type,
        });
      });
    }
  }
  let dataToSend = {
    fileName: data.outputPath,
    fileURL: fileUrl,
    placeholders: [...data.placeholders],
    signatureFields: props,
    documentName: data.outputPath,
    recipients: data.recipients,
  };
  return dataToSend;
};
module.exports = fillForm;
