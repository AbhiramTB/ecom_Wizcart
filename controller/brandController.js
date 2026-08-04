const Brand = require("../model/brandModel");
const { HttpStatus } = require("../constants/httpStatus");
const {
  BRAND_MESSAGES,
  ERROR_MESSAGES,
} = require("../constants/messages");


const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find({}).sort({ createdAt: -1 });
    const toast = req.flash("info");
    res.render("admin/brands", { brands, toast });
  } catch (error) {
    console.error("getBrands error:", error.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .send(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
  }
};


const addBrand = async (req, res) => {
  try {
    const rawName = req.body.newBrand || "";
    const brandName = rawName.trim();

    if (!brandName) {
      req.flash("info", `❗ ${BRAND_MESSAGES.NAME_REQUIRED}`);
      return res.redirect("/brands");
    }
    if (brandName.length < 2) {
      req.flash("info", `❗ ${BRAND_MESSAGES.NAME_TOO_SHORT}`);
      return res.redirect("/brands");
    }

    const escapedName = brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`^${escapedName}$`, "i");
    const exists = await Brand.findOne({ brand_name: regex });
    if (exists) {
      req.flash(
        "info",
        `${brandName} ❗ ${BRAND_MESSAGES.ALREADY_EXISTS}`
      );
      return res.redirect("/brands");
    }

    const newBrand = new Brand({ brand_name: brandName, isBlocked: false });
    await newBrand.save();

    req.flash("info", `✅ ${brandName} ${BRAND_MESSAGES.CREATED}`);
    res.redirect("/brands");
  } catch (error) {
    console.error("addBrand error:", error.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .send(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
  }
};


const editBrand = async (req, res) => {
  try {
    const { edit_id, editBrandName } = req.body;
    const brandName = (editBrandName || "").trim();

    if (!brandName) {
      req.flash("info", `❗ ${BRAND_MESSAGES.NAME_REQUIRED}`);
      return res.redirect("/brands");
    }
    if (brandName.length < 2) {
      req.flash("info", `❗ ${BRAND_MESSAGES.NAME_TOO_SHORT}`);
      return res.redirect("/brands");
    }

    const escapedName = brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`^${escapedName}$`, "i");
    const exists = await Brand.findOne({ brand_name: regex, _id: { $ne: edit_id } });
    if (exists) {
      req.flash(
        "info",
        `${brandName} ❗ ${BRAND_MESSAGES.ALREADY_EXISTS}`
      );
      return res.redirect("/brands");
    }

    await Brand.updateOne({ _id: edit_id }, { $set: { brand_name: brandName } });

    req.flash("info", `✅ ${BRAND_MESSAGES.UPDATED}`);
    res.redirect("/brands");
  } catch (error) {
    console.error("editBrand error:", error.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .send(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
  }
};


const blockBrand = async (req, res) => {
  try {
    const { id } = req.body;
    await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } });
    req.flash("info", `✅ ${BRAND_MESSAGES.BLOCKED}`);
    res.redirect("/brands");
  } catch (error) {
    console.error("blockBrand error:", error.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .send(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
  }
};

const unblockBrand = async (req, res) => {
  try {
    const { id } = req.body;
    await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } });
    req.flash("info", `✅ ${BRAND_MESSAGES.UNBLOCKED}`);
    res.redirect("/brands");
  } catch (error) {
    console.error("unblockBrand error:", error.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .send(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
  }
};


const deleteBrand = async (req, res) => {
  try {
    const { id } = req.body;
    const result = await Brand.deleteOne({ _id: id });
    if (result.deletedCount > 0) {
      req.flash("info", `🗑️ ${BRAND_MESSAGES.DELETED}`);
    } else {
      req.flash("info", `❗ ${BRAND_MESSAGES.NOT_FOUND}`);
    }
    res.redirect("/brands");
  } catch (error) {
    console.error("deleteBrand error:", error.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .send(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
  }
};


const getActiveBrands = async (req, res) => {
  try {
    const brands = await Brand.find({ isBlocked: false })
      .select("_id brand_name")
      .sort({ brand_name: 1 });
    res.status(HttpStatus.OK).json({ success: true, brands });
  } catch (error) {
    console.error("getActiveBrands error:", error.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

module.exports = {
  getBrands,
  addBrand,
  editBrand,
  blockBrand,
  unblockBrand,
  deleteBrand,
  getActiveBrands,
};
