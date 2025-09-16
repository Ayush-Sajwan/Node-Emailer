require('dotenv').config();
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const express = require("express");
const bodyParser = require("body-parser");
const rate_limit=require("express-rate-limit");
const path=require('path');
const cors=require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));


// Set view engine to EJS
app.set('view engine', 'ejs');

//trusting render proxy
app.set("trust proxy", 1);

// Set views directory (where your EJS files live)
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));


const limiter=rate_limit({
  windowMs : 5*60*1000,
  max : 3,
  message: 'You Have already submitted too many requests'
}
)

const getReadyLimiter = rate_limit({
  windowMs: 60 * 1000, 
  max: 5 ,
  message: 'Server is already Up'
});

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URL 
);

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

async function sendEmail(name,email,message) {


    let msg="Email of Sender: "+email+" \n \nMessage: "+message;

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // Construct the email
    const rawMessage = [
      `From: ${process.env.EMAIL}`,
      `To: ${process.env.SEND_TO}`,
      `Subject: Enquiry from ${name}`,
      '',
      `Email of Sender: ${email}`,
      '',
      msg
    ].join('\n');

    // Encode in base64url
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log('✅ Email sent via Gmail API:', res.data.id);
  
}

app.post("/sendMsg",limiter,async (req,res)=>{

   let {name,email,message} = req.body;


   console.log("New Mail-->"+name+" "+email+" "+message);

   
   
  try {
    await sendEmail(name,email,message);

    
    message='Thanks For Submitting Your Message. Will Contact Soon on Your Mail...'
    } catch (err) {

      console.log(err.message);
      console.log('error occurred....')
  
      message='Thanks For Submitting Your Message. Will Reach Out Soon on Your Mail...'
      
    }

    res.render('success_page',{message});
   

});

//adding this endpoint so that can make server ready
//after a cold start receiving request on other end point
app.get("/getReady",getReadyLimiter,(req,res)=>{
    console.log("health check received..");
    res.status(200).send("Ready to send Email...");
});

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});

