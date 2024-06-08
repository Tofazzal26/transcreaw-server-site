const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 4000;
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
const TotalDelivery = client.db("Transcreaw").collection("Delivery");
const ReviewDeliverymanCollection = client
  .db("Transcreaw")
  .collection("Reviews");
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
    app.get("/bookParcel/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await BookParcelCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/totalBookCount/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const bookCount = req.body;
      const update = {
        $inc: {
          TotalBookCount: +1,
        },
      };
      const result = await UserRoleCollection.updateOne(query, update);
      res.send(result);
    });

    // total delivery count

    app.patch("/totalDelivery/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const bookCount = req.body;
      const update = {
        $inc: {
          TotalDelivery: +1,
        },
      };
      const result = await UserRoleCollection.updateOne(query, update);
      res.send(result);
    });

    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // total delivery count

    app.post("/totalDelivery", async (req, res) => {
      const count = req.body;
      const result = await TotalDelivery.insertOne(count);
      res.send(result);
    });

    // all booking by date statics

    app.get("/allStatisticsDate", async (req, res) => {
      const result = await BookParcelCollection.find().toArray();
      res.send(result);
    });

    // all delivery man data

    app.get("/allDeliveryMan", async (req, res) => {
      const result = await UserRoleCollection.find({
        Role: "Delivery Man",
      }).toArray();
      res.send(result);
    });

    // user Role Update on Admin DashBoard

    app.patch("/userRoleUpdateAdmin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const NewRole = req.body;
      const RoleUpdate = {
        $set: {
          Role: NewRole.changeRole,
        },
      };
      const result = await UserRoleCollection.updateOne(query, RoleUpdate);
      res.send(result);
    });

    // delivery man assign data

    app.get("/assignDelivery/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await UserRoleCollection.findOne(query);
      const stringId = new ObjectId(user?._id).toString();
      const exist = { DeliveryMenID: stringId };
      const Delivery = await BookParcelCollection.find(exist).toArray();
      res.send(Delivery);
    });

    // delivery man parcel cancel

    app.patch("/deliveryManCancel/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const delivery = req.body;
      const updateDoc = {
        $set: {
          status: delivery.newStatus,
        },
      };
      const result = await BookParcelCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // review the delivery man

    app.post("/reviewDeliveryMan", async (req, res) => {
      const review = req.body;
      // const query = { ReviewEmail: review?.ReviewEmail };
      // const exist = await ReviewDeliverymanCollection.findOne(query);
      // if (exist) {
      //   return res.send({ message: "You Already Add Review" });
      // }
      const result = await ReviewDeliverymanCollection.insertOne(review);
      res.send(result);
    });

    // our feature section count data

    app.get("/featureAllData", async (req, res) => {
      const totalParcel = await BookParcelCollection.estimatedDocumentCount();
      const totalUser = await UserRoleCollection.estimatedDocumentCount();
      const totalDelivery = await TotalDelivery.estimatedDocumentCount();
      res.send({ totalParcel, totalUser, totalDelivery });
    });

    // deliveryman review get method

    app.get("/deliveryManReview/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await UserRoleCollection.findOne(query);
      const stringId = new ObjectId(user?._id).toString();
      const exist = { ManID: stringId };
      const result = await ReviewDeliverymanCollection.find(exist).toArray();
      res.send(result);
    });

    // delivery man average count

    app.get("/deliverymanAverageReview", async (req, res) => {
      const averageReviews = await ReviewDeliverymanCollection.aggregate([
        {
          $group: {
            _id: "$ManID",
            averageReview: { $avg: "$rating" },
          },
        },
      ]).toArray();
      res.send(averageReviews);
    });

    // delivery man was Delivered

    app.patch("/deliveryManDelivered/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const delivery = req.body;
      const updateDoc = {
        $set: {
          status: delivery.Delivery,
        },
      };
      const result = await BookParcelCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // user Role Update on Deliverymen DashBoard

    app.patch("/userRoleUpdateDelivery/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const NewRole = req.body;
      const RoleUpdate = {
        $set: {
          Role: NewRole.Delivery,
        },
      };
      const result = await UserRoleCollection.updateOne(query, RoleUpdate);
      res.send(result);
    });

    // user book parcel cancel

    app.patch("/bookParcel/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const parcel = req.body;
      const statusUpdate = {
        $set: {
          status: parcel.NewStatus,
        },
      };
      const result = await BookParcelCollection.updateOne(query, statusUpdate);
      res.send(result);
    });

    // user book details

    app.get("/bookDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await BookParcelCollection.findOne(query);
      res.send(result);
    });

    app.patch("/manageAllParcel/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const manage = req.body;
      const update = {
        $set: {
          ApproximateDate: manage.NewApproximateDate,
          DeliveryMenID: manage.NewDeliveryMenID,
          status: manage.NewStatus,
        },
      };
      const result = await BookParcelCollection.updateOne(query, update);
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

    // find all user parcel

    app.get("/allUserParcel", async (req, res) => {
      const from = req.query?.from;
      const to = req.query?.to;
      let query = {};
      if (from && to) {
        query = {
          requestDate: {
            $gte: from,
            $lte: to,
          },
        };
      }
      const result = await BookParcelCollection.find(query).toArray();
      res.send(result);
    });

    // user profile update and get

    app.get("/userProfile/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await UserRoleCollection.findOne(query);
      res.send(result);
    });

    // all user get

    app.get("/allUser", async (req, res) => {
      const result = await UserRoleCollection.find().toArray();
      res.send(result);
    });

    app.patch("/userProfile/phoneUpdate/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const phones = req.body;
      const updateDoc = {
        $set: {
          phone: phones.phone,
          photo: phones.photo,
          name: phones.name,
        },
      };
      const result = await UserRoleCollection.updateOne(query, updateDoc);
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

    app.get("/Role/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await UserRoleCollection.findOne(query);
      const role = result?.Role;
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
