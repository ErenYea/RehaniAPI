var express = require("express");
const getFields = require("../lib/getFields");

var router = express.Router();

/* GET home page. */
router.get("/", async (req, res, next) => {
  var data = req.body;
  if (data.inputPath) {
    let fieldNames = await getFields(data);
    res.status(200).json({
      success: true,
      data: fieldNames,
    });
  } else {
    res.status(404).json({
      success: false,
      message: "Please provide inputPath field",
    });
  }
});

module.exports = router;
