var express = require("express");
const fillForm = require("../lib/fillForm");
const sdk = require("api")("@signwell/v1.0#ev2e1nlrb7phe7");

sdk.auth(process.env.SIGNWELL_API_KEY);
var router = express.Router();

/* GET home page. */
router.get("/", async (req, res, next) => {
  var data = req.body;
  if (
    data.inputPath &&
    data.fieldNames &&
    data.outputPath &&
    data.fieldValues &&
    data.signatureFields &&
    data.recipients
  ) {
    let dataToSend = await fillForm(data);
    sdk
      .postApiV1Document_templates({
        draft: false,
        reminders: true,
        apply_signing_order: false,
        text_tags: false,
        allow_decline: true,
        allow_reassign: true,
        files: [
          {
            name: dataToSend.fileName,
            file_url: dataToSend.fileURL,
          },
        ],
        name: dataToSend.fileName.split(".")[0],
        placeholders: [
          ...dataToSend.placeholders,
          // { id: "rehani", name: "Rehani" },
        ],
        fields: [dataToSend.signatureFields],
      })
      .then(({ data }) => {
        console.log("Data after creating template", data);
        if (data.status == "Created") {
          let template_id = data.id;
          let template_link = data.template_link;
          setTimeout(() => {
            sdk
              .postApiV1Document_templatesDocuments({
                test_mode: false,
                draft: false,
                // with_signature_page: false,
                // reminders: true,
                // apply_signing_order: false,
                embedded_signing: true,
                // embedded_signing_notifications: true,
                // text_tags: false,
                // allow_decline: true,
                // allow_reassign: true,
                template_id: template_id,
                name: dataToSend.documentName,
                recipients: [...dataToSend.recipients],
              })
              .then(({ data }) => {
                // console.log("data", data);
                let document_id = data.id;
                let embedded_urls = data.recipients;
                res.status(200).send({
                  message: "Successfully Created the Sign Document",
                  data: {
                    document_id,
                    embedded_urls,
                    template_id,
                    template_link,
                  },
                });
              })
              .catch((err) => {
                console.log("error in document", err);
                res.status(400).send({
                  message: "Error in Signwell Document",
                  error: err,
                });
              });
          }, 10000);
        }
      })
      .catch((err) => {
        console.log("Error", err);
        res
          .status(400)
          .send({ message: "Error in Signwell Template", error: err });
      });
  } else {
    res.status(400).send({ message: "Invalid Fields Provided" });
  }
});

module.exports = router;
