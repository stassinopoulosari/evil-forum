import { dbGetHomepage } from "../db/homepage.js";

export const routeGetHomepage = async (req, res) => {
  // Query string page is always a String
  const passedPage =
      req.query.page === undefined ? undefined : parseInt(req.query.page),
    userID = req.evilUserID;
  if (passedPage !== undefined && (isNaN(passedPage) || passedPage < 0)) {
    res.status(400);
    return res.json({
      status: false,
      error: "Page must be a number >= 0",
    });
  }
  try {
    res.json({
      status: true,
      homepage: await dbGetHomepage(passedPage, userID),
    });
  } catch (err) {
    res.status(500);
    console.error(err);
    return res.json({
      success: false,
      error: err.frontEndMessage ?? err,
    });
  }
};
