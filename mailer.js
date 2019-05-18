const express = require('express');
const config = require('config');
const cors = require('cors');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const Joi = require('Joi');
const fetch = require('node-fetch');
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
          message: 'A valid email is needed',
        };
      }),
    message: Joi.string()
      .max(300)
      .required()
      .error(errors => {
        return {
          message: 'A valid message with a maximum of 300 characters is needed',
        };
      }),
    recaptcha: Joi.string()
      .required()
      .error(errors => {
        return {
          message: 'Please, confirm your humanity',
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

app.post('/mail', async (req, res) => {
  const { error } = validate(req.body);

  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }

  // Verify recaptcha
  try {
    const urlInstance = new URL(recaptchaVerifyUrl);
    const params = new URLSearchParams(
      `secret=${config.get('RECAPTCHA_KEY')}&response=${req.body.recaptcha}&remoteip=${req.connection.remoteAddress}`
    );
    urlInstance.search = params;

    const fetchResult = await fetch(urlInstance);

    const resData = await fetchResult.json();

    if (!resData.success) {
      res.status(400).json({ message: 'Verification failed, are you a bot ? ' });
      return;
    }
  } catch (err) {
    res.status(500).json({ message: 'Mail service is temporarily unavailable' });
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
      res.status(500).json({ message: 'Mail service is temporarily unavailable' });
    });
});

const port = process.env.PORT || 8000;
app.listen(port, () => console.log('listening on port ' + port));
