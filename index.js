const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const admin = require('firebase-admin');

const app = express();
app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }))

var serviceAccount = require("./haat-bazar-167f4-firebase-adminsdk-fdo36-41dc856ac2.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6pukr.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

//connect database
client.connect(err => {
    const productCollection = client.db(process.env.DB_NAME).collection(process.env.ALL_PRODUCT);
    const orderDetails = client.db(process.env.DB_NAME).collection(process.env.ORDER_DETAILS);
    //get all product
    app.get('/allProducts', (req, res) => {
        productCollection.find()
            .toArray((err, products) => {
                res.send(products)
            });

    })

    //get single product
    app.get('/buyProduct/:id', (req, res) => {
        productCollection.find({ _id: ObjectId(req.params.id) })
            .toArray((err, products) => {
                res.send(products)
            });

    })

    //get order data
    app.get('/orders', (req, res) => {
        const bearer = req.headers.authorization;
        // console.log(bearer);
        if (bearer && bearer.startsWith('bearer ')) {
            const idToken = bearer.split(' ')[1];
            // console.log(idToken);
            admin
                .auth()
                .verifyIdToken(idToken)
                .then((decodedToken) => {
                    let tokenEmail = decodedToken.email;
                    const queryEmail = req.query.email;
                    // console.log(tokenEmail, queryEmail);
                    if (tokenEmail == req.query.email) {
                        orderDetails.find({ email: queryEmail })
                            .toArray((err, orders) => {
                                res.send(orders)
                            });
                    }
                    else {
                        res.status(401).send('un-authorised access !')
                    }

                })
                .catch((error) => {
                    res.status(401).send('un-authorised access !')
                });
        }
        else {
            res.status(401).send('un-authorised access !')
        }

    })

    //confirm order
    app.post('/confirmOrder', (req, res) => {
        const newProduct = req.body;
        // console.log("new product:", newProduct);
        orderDetails.insertOne(newProduct)
            .then(result => {
                console.log(result.insertedCount);
                res.send(result.insertedCount > 0)
            })
    })

    app.post('/addProduct', (req, res) => {
        const newProduct = req.body;
        console.log("new product:", newProduct);
        productCollection.insertOne(newProduct)
            .then(result => {
                console.log(result.insertedCount);
                res.send(result.insertedCount > 0)
            })
    })

    //delete item

    app.delete('/deleteItem/:id', (req, res) => {
        const id = ObjectId(req.params.id)
        console.log(id);
        productCollection.deleteOne({ _id: id })
            .then(document => res.send(document.value))
    })
});




app.get('/', (req, res) => {
    res.send("server is running")
})
const port = 5000;
app.listen(process.env.PORT || port)