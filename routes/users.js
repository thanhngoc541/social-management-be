var express = require('express');
var router = express.Router();
var db = require('../firebase');
require('dotenv').config();
const accountSid = process.env.ACCOUNTSID;
const authToken = process.env.AUTHTOKEN;
const client = require('twilio')(accountSid, authToken);
/* GET users listing. */
router.get('/', async function (req, res, next) {
    const snapshot = await db.collection('users').get();

    const users = snapshot.docs.map((doc) => doc.data());
    res.send(users);
});

router.post('/get-code', async function (req, res, next) {
    const users = db.collection('users');
    var currentTime = new Date();
    const data = {
        phoneNumber: req.body?.phoneNumber,
        accessCode: Math.random().toString().slice(2, 8),
        code_expiration: currentTime.setMinutes(currentTime.getMinutes() + 3),
    };
    const result = await users.doc(req.body?.phoneNumber).set(data);
    await client.messages
        .create({
            body: `Your validation code is ${data.accessCode}`,
            from: '+17697598628',
            to: `${data.phoneNumber}`,
        })
        .then((message) => {
            console.log('Send success');
            res.send({ success: true });
        })
        .catch((error) => {
            console.log('err222or', error);
            return res.send({ success: false, message: error });
        });
});

router.post('/validate-code', async function (req, res, next) {
    const userRef = db.collection('users').doc(req.body?.phoneNumber);
    const user = (await userRef.get()).data();
    if (req.body.accessCode?.length != 6 || user.accessCode != req.body.accessCode) {
        return res.send({ success: false, message: 'Code invalid' });
    }
    if (user.code_expiration < new Date()) {
        return res.send({ success: false, message: 'Code has been expired!' });
    }
    user.accessCode = '';
    await userRef.set(user);
    res.send({ success: true, user: user });
});

module.exports = router;
