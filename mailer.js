const express = require('express');
const config = require('config');
const cors = require('cors');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const Joi = require('Joi');
const fetch = require("node-fetch");
const { URL, URLSearchParams } = require('url');

const recaptchaVerifyUrl = 'https://www.google.com/recaptcha/api/siteverify';

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key: config.get('SENGRID_KEY'),
    },
  })
);

const validate = body => {
  const schema = {
    email: Joi.string()
      .email({ minDomainAtoms: 2 })
      .required()
      .error(errors => {
        return {
          message: 'Email doit être renseigné et valide',
        };
      }),
    message: Joi.string()
      .max(300)
      .required()
      .error(errors => {
        return {
          message: 'Message doit être renseigné et ne pas dépasser 300 caractères',
        };
      }),
    recaptcha: Joi.string()
      .required()
      .error(errors => {
        return {
          message: 'Echec, seriez-vous un robot ?',
        };
      }),
  };

  return Joi.validate(body, schema);
};

const app = express();

app.use(
  cors({
    origin: config.get('CLIENT_URL'),
  })
);

app.use(express.json());

app.post('/mail', (req, res) => {
  const { error } = validate(req.body);

  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }

  // Verify recaptcha
  try{
    const urlInstance = new URL(recaptchaVerifyUrl);
    const params = new URLSearchParams(`secret=${RECAPTCHA_KEY}&response=${req.body.recaptcha}&remoteip=${req.connection.remoteAddress}`);
    urlInstance.search = params;

    const fetchResult = await fetch(urlInstance);

    const fetchData = await fetchResult.json();

  } catch(err) {
    res.status(500).json({ message: 'Le service mail est temporairement indisponible' });
    return;
  }
 
  //

  transporter
    .sendMail({
      to: config.get('RECIPIENT_EMAIL'),
      from: req.body.email,
      subject: 'MESSAGE FROM YOUR WEBPAGE',
      html: req.body.message,
    })
    .then(done => {
      res.json({ message: 'done' });
    })
    .catch(err => {
      res.status(500).json({ message: 'Le service mail est temporairement indisponible' });
    });
});

const port = process.env.PORT || 8000;
app.listen(port, () => console.log('listening on port ' + port));
