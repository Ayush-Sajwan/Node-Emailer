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

    const { token } = await oAuth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: token,
      },
    });

    let msg="Email of Sender: "+email+" \n \nMessage: "+message;

    const mailOptions = {
      from: `Mail Bot <${process.env.EMAIL}>`,
      to: process.env.SEND_TO,
      subject: 'Enquiry on your portfolio from '+name,
      text: msg,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', result.response);
  
}

app.post("/sendMsg",limiter,async (req,res)=>{

   let {name,email,message} = req.body;


   console.log("New Mail-->"+name+" "+email+" "+message);

   
   
  try {
    await sendEmail(name,email,message);

    
    message='Thanks For Submitting Your Message. Will Contact Soon on Your Mail...'
    } catch (err) {
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
  console.log("Server running on http://localhost:3000");
});

