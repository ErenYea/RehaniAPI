var express = require("express");
const renameFields = require("../lib/renameFields");
var router = express.Router();

/* GET rename page. */
router.post("/", async (req, res, next) => {
  var data = req.body;
  try {
    var results = await renameFields(data);
    if (results.success) {
      res.status(201).send({
        success: true,
        message: "Successfully renamed",
        fileURL: results.fileURL,
      });
    } else {
      res.status(404).send({
        success: false,
        message: error,
      });
    }
  } catch (err) {
    res.status(404).send({
      success: false,
      message: err,
    });
  }
});

module.exports = router;
