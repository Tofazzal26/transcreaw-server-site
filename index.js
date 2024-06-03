const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 4000;
require("dotenv").config();

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rgxjhma.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const UserRoleCollection = client.db("Transcreaw").collection("Users");
const BookParcelCollection = client.db("Transcreaw").collection("BookParcel");

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // user parcel book

    app.post("/bookParcel", async (req, res) => {
      const book = req.body;
      const result = await BookParcelCollection.insertOne(book);
      res.send(result);
    });
    // get user book parcel data
    app.get("/bookParcel/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await BookParcelCollection.find(query).toArray();
      res.send(result);
    });

    // user book parcel delete

    app.delete("/bookParcel/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await BookParcelCollection.deleteOne(query);
      res.send(result);
    });

    // user book details

    app.get("/bookDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await BookParcelCollection.findOne(query);
      res.send(result);
    });

    // user book update
    app.put("/bookParcelUpdate/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const book = req.body;
      const updateBook = {
        $set: {
          phone: book.phones,
          parcelType: book.parcelTypes,
          weightPrice: book.weightPrices,
          parcelWeight: book.parcelWeights,
          requestDate: book.requestDates,
          receiverName: book.receiverNames,
          receiverPhone: book.receiverPhones,
          parcelDeliveryAddress: book.parcelDeliveryAddressNew,
          Latitude: book.Latitudes,
          Longitude: book.Longitudes,
        },
      };
      const result = await BookParcelCollection.updateOne(query, updateBook);
      res.send(result);
    });

    // user role define
    app.post("/userRole", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const isExist = await UserRoleCollection.findOne(query);
      if (isExist) {
        return res.send({ message: "User Is Already Added" });
      }
      const result = await UserRoleCollection.insertOne(user);
      res.send(result);
    });

    app.get("/Role/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await UserRoleCollection.findOne(query);
      const role = result.Role;
      res.send({ role });
    });

    // jwt token apply

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "356d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          sameSite: "strict",
          secure: false,
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      res
        .clearCookie("token", {
          sameSite: "strict",
          httpOnly: true,
          secure: false,
          maxAge: 0,
        })
        .send({ success: true });
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Transcreaw Server Is Running");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
