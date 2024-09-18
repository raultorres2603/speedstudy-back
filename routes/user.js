var express = require("express");
var router = express.Router();
const saltRounds = parseInt(process.env.SR);
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

router.get("/info", async function (req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  try {
    const { payload } = await jose.jwtVerify(
      token,
      new TextEncoder().encode(process.env.SKT)
    );
    res.status(200).json({ user: payload.user });
  } catch (error) {
    res.status(401).json({ error: error });
  }
});

router.get("/refresh", async function (req, res, next) {
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
        const result = await client
          .db("sscards")
          .collection("users")
          .aggregate([
            { $match: { _id: new ObjectId(user._id) } },
            {
              $lookup: {
                from: "themes",
                localField: "_id",
                foreignField: "creator",
                as: "themes",
              },
            },
          ])
          .toArray();
        if (result[0]) {
          delete result[0].password;
          const newToken = await new jose.SignJWT({
            user: result[0],
          })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("1h")
            .sign(new TextEncoder().encode(process.env.SKT));
          res.status(200).json({ token: newToken });
        } else {
          res.status(404).send("Usuario no encontrado");
        }
      } catch (error) {
        res.status(501).send("Error on finding");
      } finally {
        await client.close();
      }
    } catch (error) {
      res.status(500).send("Error on connecting");
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
