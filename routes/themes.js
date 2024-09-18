var express = require("express");
var router = express.Router();
var jose = require("jose");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://raultorres2603:${process.env.SMONGO}@c0.zpepo.mongodb.net/?retryWrites=true&w=majority&appName=c0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

router.get("/info/:themeId", async function (req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  try {
    const { payload } = await jose.jwtVerify(
      token,
      new TextEncoder().encode(process.env.SKT)
    );

    if (!payload.user) {
      res.status(401).json({ error: "No token provided" });
    }
    const { user } = payload;

    try {
      await client.connect();
      try {
        const theme = await client
          .db("sscards")
          .collection("themes")
          .findOne({
            _id: new ObjectId(req.params.themeId),
            creator: new ObjectId(user._id),
          });
        res.status(200).json({ theme: theme });
      } catch (error) {
        res.status(404).json({ error: error });
      } finally {
        await client.close();
      }
    } catch (error) {
      res.status(500).json({ error: error });
    }
  } catch (error) {
    res.status(401).json({ error: error });
  }
});

router.post("/new", async function (req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  try {
    const { payload } = await jose.jwtVerify(
      token,
      new TextEncoder().encode(process.env.SKT)
    );
    try {
      await client.connect();
      try {
        await client
          .db("sscards")
          .collection("themes")
          .insertOne({
            name: req.body.theme.name,
            subThemes: req.body.theme.subThemes,
            creator: new ObjectId(payload.user._id),
          });
        res.status(200).json({ success: "Theme created" });
      } catch (error) {
        res.status(500).json({ error: error });
      }
    } catch (error) {
      res.status(500).json({ error: error });
    }
  } catch (error) {
    res.status(401).json({ error: error });
  }
});

router.put("/edit/:themeId", async function (req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  try {
    const { payload } = await jose.jwtVerify(
      token,
      new TextEncoder().encode(process.env.SKT)
    );
    try {
      await client.connect();
      try {
        await client
          .db("sscards")
          .collection("themes")
          .updateOne(
            { _id: new ObjectId(req.params.themeId) },
            {
              $set: {
                subThemes: req.body.theme.subThemes,
              },
            }
          );
        res.status(200).json({ success: "Theme edited" });
      } catch (error) {
        res.status(404).json({ error: error });
      }
    } catch (error) {
      res.status(500).json({ error: error });
    }
  } catch (error) {
    res.status(401).json({ error: error });
  }
});

router.delete("/remove/:themeId", async function (req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  try {
    const { payload } = await jose.jwtVerify(
      token,
      new TextEncoder().encode(process.env.SKT)
    );
    try {
      await client.connect();
      try {
        await client
          .db("sscards")
          .collection("themes")
          .deleteOne({ _id: new ObjectId(req.params.themeId) });
        res.status(200).json({ success: "Theme deleted" });
      } catch (error) {
        res.status(404).json({ error: error });
      }
    } catch (error) {
      res.status(500).json({ error: error });
    }
  } catch (error) {
    res.status(401).json({ error: error });
  }
});

router.get("/edit/:themeId", async function (req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  try {
    const { payload } = await jose.jwtVerify(
      token,
      new TextEncoder().encode(process.env.SKT)
    );
    try {
      await client.connect();
      try {
        const result = await client
          .db("sscards")
          .collection("themes")
          .findOne({
            _id: new ObjectId(req.params.themeId),
            creator: new ObjectId(payload.user._id),
          });
        res.status(200).json({ theme: result });
      } catch (error) {
        res.status(404).json({ error: error });
      } finally {
        await client.close();
      }
    } catch (error) {
      res.status(500).json({ error: error });
    }
  } catch (error) {
    res.status(401).json({ error: error });
  }
});

router.use(async function (req, res, next) {
  const token = req.headers.authorization?.split(" ")[0];
  if (token !== "Bearer") {
    res.status(401).json({ error: "No token provided" });
  } else {
    const tokenUser = req.headers.authorization.split(" ")[1];
    try {
      const { payload } = jose.jwtVerify(
        tokenUser,
        new TextEncoder().encode(process.env.SKT)
      );
      if (!payload.user) {
        res.status(401).json({ error: "No token provided" });
      }
      const { user } = payload;
      //comprobar si el usuario existe en la BD
      try {
        await client.connect();
        try {
          const result = await client
            .db("sscards")
            .collection("users")
            .findOne({
              _id: new ObjectId(user._id),
            });
          if (result) {
            next();
          } else {
            res.status(404).json({ error: "User not found" });
          }
        } catch (error) {
          res.status(500).json({ error: error });
        }
      } catch (error) {}
      next();
    } catch (error) {
      res.status(401).json({ error: error });
    }
    next();
  }
});

module.exports = router;
