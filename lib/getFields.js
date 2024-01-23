const { PDFDocument, Unit } = require("pdf-lib");

const getFields = async (data, cond = false) => {
  const response = await fetch(data.inputPath);
  const pdfBuffer = await response.arrayBuffer();
  var pdfDoc = await PDFDocument.load(pdfBuffer);
  var form = pdfDoc.getForm();
  const fields = form.getFields();
  let fieldsName = [];
  fields.forEach((field) => {
    const type = field.constructor.name;
    const name = field.getName();
    if (cond) {
      if (type == "PDFTextField") {
        fieldsName.push([type, name]);
      }
    } else {
      fieldsName.push([type, name]);
    }
    // console.log(`${type}: ${name}`);
  });
  return fieldsName;
};
module.exports = getFields;
