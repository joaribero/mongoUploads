const express = require('express');
//const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
//const { FILE } = require('dns');

const app = express();

//Middleware
//app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

//Mongo URI
const mongoURI = 'YOUR OWN MONGO URI CONNECTION HERE'

//Create mongo connection
const conn = mongoose.createConnection(mongoURI,{
    useNewUrlParser: true,
    useUnifiedTopology: true
});

//Init gfs
let gfs;
let gridFSBucket;

conn.once('open', () => {
    //Init stream
    gfs = Grid(conn.db,mongoose.mongo);
    gridFSBucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'uploads'
    });
    gfs.collection('uploads');
});

//Create storage engine
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
    }
});
const upload = multer({ storage });

// @route GET /
// @desc Loads form
app.get('/', (req,res) => {
    gfs.files.find().toArray((err, files) => {
        //Check if files
        if (!files || files.length === 0) {
            res.render('index',{files: false});
        } else {
            files.map(file => {
                if (file.contentType === 'image/jpeg' || file.contentType === 'img/png') {
                    file.isImage = true;
                } else {
                    file.isImage = false;
                };
            });
            res.render('index', {files: files});
        };
    });
    
    //res.render('index');
});

// @route POST /upload
// @desc Uploads file to DB
app.post('/upload',upload.single('file'),(req,res) => {
    //res.json({file: req.file});
    res.redirect('/');
});

// @route GET /files
// @desc Display all files in JSON
app.get('/files',(req,res) => {
    gfs.files.find().toArray((err, files) => {
        //Check if files
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: 'No files exist'
            });
        };

        //files exist
        return res.json(files);
    });
});

// @route GET /files/:filename
// @desc Display single file object in JSON
app.get('/files/:filename',(req,res) => {
    gfs.files.findOne({filename: req.params.filename}, (err, file) => {
        //Check if file
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'No file exists'
            });
        };

        //file exists
        return res.json(file);
    });
});

// @route GET /image/:filename
// @desc Display image
app.get('/image/:filename',(req,res) => {
    gfs.files.findOne({filename: req.params.filename}, (err, file) => {
        //Check if file
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'No file exists'
            });
        };

        //check if image
        if (file.contentType === 'image/jpeg' || file.contentType === 'img/png') {
            //Read output to browser
            const readstream = gridFSBucket.openDownloadStream(file._id);
            readstream.pipe(res);
        } else {
            res.status(404).json({
                err: 'Not an image'
            });
        };       
    });
});

// @route DELETE /files/:id
// @desc Delete file
app.delete('/files/:id',(req,res) => {

});


const port = 5000;

app.listen(process.env['PORT'] || port, () => console.log(`Server started on port ${port}`));

