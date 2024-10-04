const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const userm = require('./models/user');
const postm = require('./models/post');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleWare = multer( { dest : 'uploads/' });
const fs = require("fs");

const secretpk = "jvdsygueduysdknrtetykgdej";
const salt = bcrypt.genSaltSync(10);

mongoose.connect("mongodb+srv://aerlee:h28gUA4SQfMzboiY@cluster0.dqfv1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

const app = express();

app.use(cors( { 
    credentials:true,
    origin:'https://paperplane-blog.onrender.com'}));
app.use(express.json());
app.use(cookieParser());

// server static files 
app.use( '/uploads', express.static( __dirname + '/uploads' ))

// handle user registration
app.post('/register',async (request, response)=>{
    const { username, password } = request.body;
    const userDoc = await userm.create(
         { username,
           password:bcrypt.hashSync( password, salt ),
         } );
    response.json(userDoc);
})


// functions 
function verifyToken(token) {
    try {
      const decodedData = jwt.verify(token, secretpk);
      return decodedData;
    } catch (error) {
      return null; // Token is invalid or expired
    }
  }



// handle login
app.post('/login', async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', 'https://paperplane-blog.onrender.com');
    const { username, password } = request.body;
    const userDoc = await userm.findOne( { username } );
    if (!userDoc) {
        response.status(400).json("invalid username or password"); 
    } else {

        const passOk = bcrypt.compareSync( password, userDoc.password );
    
        if (passOk) {
           const token =  jwt.sign( { 
                username,
                id:userDoc._id
                }, secretpk,
                { expiresIn : '10h'})
        response.cookie( 'authToken', token, { httpOnly: true, secure: true } );
        response.json( userDoc );

        } else {
            response.status(400).json("invalid username or password");
        }
    }
    
})

// handle token verification 
app.get( '/profile', (request, response ) => {
    response.setHeader('Access-Control-Allow-Origin', 'https://paperplane-blog.onrender.com');
    const cookies = request.headers.cookie;
    const str = request.cookies.authToken;
    // let token;
    // if (str.includes('=')) {
    //    token = str.replace('=', '');
    // } else {
    //    token = str;
    // }

    // if ( token === '' ) {
    //     response.json('no-user');
    // } else {
    // jwt.verify( token, secretpk, {}, ( error, decoded ) => {
    //     if (error) throw error ;
    //     response.json(decoded) ;
    // })  
    // } 
    
    response.json(str + 'and' + cookies)
})

// handle logging out
// app.post( '/logout', (request, response) => {
//     response.cookie('token', '').json(" user logged out");
// })

// handles adding of posts
app.post( '/addpost', uploadMiddleWare.single('file'), async (request, response) => {
    const { title, summary, content } = request.body;

    const { originalname, path } = request.file;
    const parts = originalname.split('.');
    const  extension = parts[1];
    const newPath = path+'.'+extension;
    const { token } = request.headers.authorization;

    fs.renameSync( path, newPath );
    
    jwt.verify( token, secretpk, {}, async (error, userInfo ) => {
        const id = userInfo.id;

        const postDoc = await postm.create({
            title, 
            summary, 
            content, 
            cover : newPath,
            user : id,
          })

        response.json(postDoc);
    });
    
})

// handles displaying post on homepage
app.get( '/posts', async ( request, response ) => {
   const posts = await  postm.find().populate("user", [ 'username' ]);
   response.json(posts);
})

// handles page view 
app.get( '/post/:id', async ( request, response) => {
    const { id } = request.params;
    const postData = await postm.findById(id).populate( 'user', [ 'username' ]);
    response.json(postData);
})

// handles post edit 
app.put('/post', uploadMiddleWare.single('file'), async ( request, response) => {
    const { title, summary, content, id } = request.body;
    let newPath = null;

    // include file extension to the path
    if (request.file) {
        const { originalname, path } = request.file;
        const parts = originalname.split('.');
        const  extension = parts[1];
        newPath = path+'.'+extension;
        fs.renameSync( path, newPath);
    }

    const { token } = request.cookies;

    jwt.verify( token, secretpk, {}, async ( error, author ) => {
        if (error) throw error;
        const postDoc = await postm.findById(id);
        const isAuthor = JSON.stringify(postDoc.user) === JSON.stringify(author.id);
        if (isAuthor) {
            postDoc.title = title;
            postDoc.summary = summary;
            postDoc.content = content;
            postDoc.cover = newPath ? newPath : postDoc.cover;

            await postDoc.save();
            response.json(postDoc);
        } else {
            response.status(400).json('you are not the Author');
        }
    })
})

app.listen(5000);




//h28gUA4SQfMzboiY  aerlee
//mongodb+srv://aerlee:h28gUA4SQfMzboiY@cluster0.dqfv1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0